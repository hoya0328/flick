import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({ supabase: { rpc: mock.rpc } }));
import {
  safeCommunityPath,
  publicCommunityUrl,
  notificationPath,
  postIssue,
  mergeById,
  followMember,
  listPosts,
  savePost,
  markNotificationsRead,
  socialRpc,
} from "../src/features/community/social-service";
const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  mock.rpc.mockReset();
  mock.rpc.mockResolvedValue({ data: [], error: null });
});
describe("free social boundaries", () => {
  it('shares through a static 200 entry with a strict return path',()=>{
    const link=new URL(publicCommunityUrl(`/people/${id}`));
    expect(link.pathname).toBe('/');expect(link.searchParams.get('returnTo')).toBe(`/people/${id}`);
    expect(publicCommunityUrl('https://evil.example')).toBe('https://flick-film-journal--beta.expo.app/welcome');
  });
  it("allowlists only exact UUID content routes after login", () => {
    for (const kind of ["review", "post", "people"])
      expect(safeCommunityPath(`/${kind}/${id}`)).toBe(`/${kind}/${id}`);
    for (const path of [
      "//evil.example",
      "https://evil.example",
      `/people/${id}?admin=true`,
      `/people/${id}/../admin`,
      "/admin",
      {},
      null,
    ])
      expect(safeCommunityPath(path)).toBeUndefined();
  });
  it("never chooses a destination from raw notification body", () => {
    const n = {
      id,
      kind: "follow" as const,
      actorName: "test",
      actorProfileId: id,
      reviewId: null,
      postId: null,
      createdAt: "now",
      read: false,
    };
    expect(notificationPath(n)).toBe(`/people/${id}`);
    expect(notificationPath({ ...n, actorProfileId: null })).toBeUndefined();
    expect(
      notificationPath({ ...n, postId: "https://evil.example" }),
    ).toBeUndefined();
  });
  it("validates body and photo limits before save without rejecting ordinary text", () => {
    expect(postIssue("   ", [])).toBe("본문을 입력해야 합니다.");
    expect(postIssue("가".repeat(2001), [])).toBeTruthy();
    expect(postIssue("hello", Array(6).fill("path"))).toBeTruthy();
    expect(postIssue("<script> is ordinary text", [])).toBeNull();
  });
  it("paginates without duplicate cards", () =>
    expect(
      mergeById(
        [{ id: "a", value: 1 }],
        [
          { id: "a", value: 2 },
          { id: "b", value: 3 },
        ],
      ),
    ).toEqual([
      { id: "a", value: 2 },
      { id: "b", value: 3 },
    ]));
  it("sends target and intent, never a caller-supplied acting user", async () => {
    await followMember(id, true);
    expect(mock.rpc).toHaveBeenCalledWith("set_member_follow", {
      p_target: id,
      p_follow: true,
    });
    await savePost(null, "body", [], "private");
    expect(mock.rpc).toHaveBeenCalledWith("save_social_post", {
      p_id: null,
      p_body: "body",
      p_photos: [],
      p_visibility: "private",
    });
    await listPosts("member", 20, id);
    expect(mock.rpc).toHaveBeenCalledWith("list_social_posts", {
      p_scope: "member",
      p_offset: 20,
      p_user: id,
      p_post: null,
    });
    await markNotificationsRead(id);
    expect(mock.rpc).toHaveBeenCalledWith("mark_my_notifications_read", {
      p_id: id,
    });
  });
  it("does not expose raw server internals in user messages", async () => {
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "post_not_found" },
    });
    await expect(socialRpc("test")).rejects.toThrow("게시물");
    mock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "SECRET server stack" },
    });
    await expect(socialRpc("test")).rejects.not.toThrow("SECRET");
  });
  it("keeps tables RPC-only and new permissions off", () => {
    const sql = readFileSync(
      "supabase/migrations/202610270003_free_community.sql",
      "utf8",
    );
    expect(sql).toContain("community_public boolean not null default false");
    expect(sql).toContain("can_moderate_posts boolean not null default false");
    expect(sql).toContain(
      "revoke all on public.%I from public,anon,authenticated",
    );
    expect(sql).toContain(
      "status='active'and(p.visibility='public'or p.user_id=auth.uid())",
    );
    expect(sql).toContain("visibility='private'");
    expect(sql).toContain("removed_at>now()-interval '7 days'");
    expect(sql).not.toMatch(/grant .*social_posts.*to (anon|authenticated)/i);
  });
});
describe("PWA safety contract", () => {
  it("caches only same-origin public static assets, never API or account HTML", () => {
    const sw = readFileSync("public/sw.js", "utf8");
    expect(sw).toContain(
      "request.method!=='GET'||url.origin!==self.location.origin",
    );
    expect(sw).toContain("url.pathname.startsWith('/_expo/static/')");
    expect(sw).toContain("request.mode==='navigate'");
    expect(sw).not.toMatch(/cache\.put\(request.*navigate/);
    expect(sw).not.toContain("self.skipWaiting(");
    expect(sw).not.toContain("clients.claim(");
    const manifest = JSON.parse(
      readFileSync("public/manifest.webmanifest", "utf8"),
    );
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
      ["192x192", "512x512"],
    );
  });
});
