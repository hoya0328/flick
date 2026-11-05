import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { discoverDemoMovies, getDemoMovie } from '../discovery/movies';
import { draftIssue, normalizeBlocks, lockedBlockIssue, type AnonymousAnswer, type FeedComment, type FeedDraft, type FeedPost } from './feed-model';
import * as legacy from './social-service';
const KEY = 'flick.feed.v3.demo';
type DemoState = { posts: FeedPost[]; comments: Record<string, FeedComment[]>; answers: Record<string, (AnonymousAnswer & { hidden?: boolean })[]> };
const seedPost = (id: string, body: string): FeedPost => ({ id, body, photos: [], visibility: 'public', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), removedAt: null, isMine: false, authorName: '데모 플리커 · 예시', authorProfileId: null, avatar: null, likeCount: 0, commentCount: 0, viewerLiked: false, viewerSaved: false, blocks: [], viewerFollows: true, demo: true });
function initial(): DemoState {
  const first = seedPost('20000000-0000-4000-8000-000000000001', '영화를 보고 오래 남은 장면을 나눠보세요. 이 글과 참여 결과는 이 브라우저의 데모에만 저장됩니다.');
  first.blocks = [{ type: 'movie', movieId: discoverDemoMovies().movies[0]!.id }]; first.movie = discoverDemoMovies().movies[0];
  const second = seedPost('20000000-0000-4000-8000-000000000002', '영화를 볼 때 무엇을 더 좋아하시나요? 투표와 익명 질문을 로컬에서 체험해 보세요.');
  second.blocks = [{ type: 'poll', options: ['극장', '집에서'] }, { type: 'question', prompt: '가장 기억에 남는 영화는 무엇인가요?' }];
  second.poll = { options: ['극장', '집에서'], counts: [0, 0], total: 0, mine: null }; second.question = { prompt: '가장 기억에 남는 영화는 무엇인가요?', count: 0, canAnswer: true };
  return { posts: [first, second], comments: {}, answers: {} };
}
async function demoRead(): Promise<DemoState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) { const value = initial(); await AsyncStorage.setItem(KEY, JSON.stringify(value)); return value; }
  try { const value = JSON.parse(raw) as DemoState; if (Array.isArray(value.posts) && value.comments && value.answers) { for (const post of value.posts) if (post.question) { post.question.answered = Boolean(value.answers[post.id]?.some(answer => answer.isMine)); post.question.canAnswer = !post.isMine && Boolean(post.viewerFollows) && !post.question.answered; } return value; } } catch { /* Do not overwrite a damaged local draft. */ }
  throw new Error('데모 저장소를 읽지 못했어요. 브라우저 저장 설정을 확인해 주세요.');
}
// Serialize local mutations so simultaneous clicks cannot overwrite each other.
let demoQueue: Promise<unknown> = Promise.resolve();
function mutate<T>(change: (data: DemoState) => T | Promise<T>): Promise<T> {
  const result = demoQueue.then(async () => { const state = await demoRead(); const value = await change(state); await AsyncStorage.setItem(KEY, JSON.stringify(state)); return value; });
  demoQueue = result.catch(() => undefined); return result;
}
function find(data: DemoState, id: string) { const post = data.posts.find(item => item.id === id && item.status === 'active' && (item.visibility === 'public' || item.isMine)); if (!post) throw new Error('게시물을 찾을 수 없어요.'); return post; }
const pending = () => new Error('새 참여 기능은 최종5단계 DB 적용 후 연결됩니다. 지금은 데모에서만 테스트할 수 있어요.');
const rpcMessages: Record<string, string> = { poll_locked: '참여자가 있어 투표를 바꿀 수 없어요.', question_locked: '응답이 있어 질문을 바꿀 수 없어요.', follower_required: '작성자를 팔로우한 회원만 익명 응답을 남길 수 있어요.', already_answered: '이미 응답을 남겼어요.', invalid_parent: '답글을 연결할 댓글을 다시 확인해 주세요.', invalid_poll: '투표 선택지를 확인해 주세요.', invalid_question: '질문을 1~120자로 입력해 주세요.', invalid_answer: '응답은 1~500자로 입력해 주세요.', answer_limit: '하루 익명 응답 한도20개에 도달했어요.' };
async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('로그인이 필요해요.');
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(rpcMessages[error.message] ?? '요청하지 못했어요. 로그인·네트워크·권한을 확인해 주세요.');
  return data as T;
}
export function createFeedApi(mode: 'demo' | 'supabase') {
  let capability: Promise<boolean> | undefined;
  const available = () => mode === 'demo' ? Promise.resolve(true) : capability ??= (async () => {
    if (!supabase) return false;
    const { data, error } = await supabase.rpc('feed_v3_status');
    if (error && ['PGRST202', '42883'].includes(error.code)) return false;
    if (error) throw new Error('피드 연결을 확인하지 못했어요. 다시 시도해 주세요.');
    return data === true;
  })();
  return {
    mode, available,
    async list(scope: 'public' | 'following' | 'detail' | 'mine' | 'trash' | 'saved' = 'public', offset = 0, id: string | null = null): Promise<FeedPost[]> {
      if (mode === 'demo') return (await demoRead()).posts.filter(item => scope === 'trash' ? item.status === 'removed' && item.isMine && Date.parse(item.removedAt ?? '') > Date.now() - 7 * 86400000 : item.status === 'active' && (scope === 'detail' ? item.id === id && (item.visibility === 'public' || item.isMine) : scope === 'mine' ? item.isMine : item.visibility === 'public' && (scope !== 'following' || item.viewerFollows) && (scope !== 'saved' || item.viewerSaved))).slice(offset, offset + 20);
      return await available() ? rpc<FeedPost[]>('list_social_posts_v3', { p_scope: scope, p_offset: offset, p_post: id, p_user: null }) : legacy.listPosts(scope, offset, null, id);
    },
    async save(id: string | null, draft: FeedDraft): Promise<string> {
      const invalid = draftIssue(draft, true);
      if (invalid || !['private', 'public'].includes(draft.visibility)) throw new Error(invalid?.message ?? '공개 범위를 확인해 주세요.');
      const blocks = normalizeBlocks(draft.blocks);
      if (mode !== 'demo') {
        if (await available()) return rpc<string>('save_social_post_v3', { p_id: id, p_body: draft.body, p_photos: draft.photos, p_visibility: draft.visibility, p_blocks: blocks });
        if (blocks.length) throw pending();
        return legacy.savePost(id, draft.body, draft.photos, draft.visibility);
      }
      return mutate(state => {
        let post: FeedPost;
        if (id) { post = find(state, id); if (!post.isMine) throw new Error('본인의 게시물만 수정할 수 있어요.'); const issue = lockedBlockIssue(post, blocks); if (issue) throw new Error(issue); if (state.answers[id]?.length && JSON.stringify(post.blocks?.find(block => block.type === 'question')) !== JSON.stringify(blocks.find(block => block.type === 'question'))) throw new Error('응답이 있어 질문을 바꿀 수 없어요.'); }
        else { post = { ...seedPost(crypto.randomUUID(), ''), authorName: '나 · 로컬 데모', isMine: true }; state.posts.unshift(post); }
        post.body = draft.body.trim(); post.photos = draft.photos; post.visibility = draft.visibility; post.blocks = blocks; post.updatedAt = new Date().toISOString();
        const movie = blocks.find(block => block.type === 'movie'); post.movie = movie?.type === 'movie' ? getDemoMovie(movie.movieId) : null;
        const poll = blocks.find(block => block.type === 'poll'); post.poll = poll?.type === 'poll' ? post.poll && JSON.stringify(post.poll.options) === JSON.stringify(poll.options) ? post.poll : { options: poll.options, counts: poll.options.map(() => 0), total: 0, mine: null } : undefined;
        const question = blocks.find(block => block.type === 'question'); post.question = question?.type === 'question' ? { prompt: question.prompt, count: post.question?.count ?? 0, canAnswer: false } : undefined;
        return post.id;
      });
    },
    async react(id: string, kind: 'like' | 'save', active: boolean) {
      if (mode !== 'demo') return legacy.reactToPost(id, kind, active);
      return mutate(state => { const post = find(state, id); if (post.visibility !== 'public') throw new Error('공개 글에만 참여할 수 있어요.'); if (kind === 'like') { post.likeCount += Number(active) - Number(post.viewerLiked); post.viewerLiked = active; } else post.viewerSaved = active; });
    },
    async remove(id: string) { if (mode !== 'demo') return legacy.removePost(id, true); return mutate(state => { const post = find(state, id); if (!post.isMine) throw new Error('본인의 글만 삭제할 수 있어요.'); post.status = 'removed'; post.removedAt = new Date().toISOString(); }); },
    async restore(id: string) { if (mode !== 'demo') return legacy.removePost(id, false); return mutate(state => { const post = state.posts.find(item => item.id === id && item.isMine && item.status === 'removed' && Date.parse(item.removedAt ?? '') > Date.now() - 7 * 86400000); if (!post) throw new Error('복원할 게시물을 찾을 수 없어요.'); post.status = 'active'; post.visibility = 'private'; post.removedAt = null; post.updatedAt = new Date().toISOString(); }); },
    async vote(id: string, option: number) {
      if (mode !== 'demo') { if (!(await available())) throw pending(); return rpc<void>('vote_social_post', { p_post: id, p_option: option }); }
      return mutate(state => { const post = find(state, id), poll = post.poll; if (post.visibility !== 'public' || !poll || !Number.isInteger(option) || option < 0 || option >= poll.options.length) throw new Error('투표 선택지를 확인해 주세요.'); if (poll.mine !== null) poll.counts[poll.mine]!--; else poll.total++; poll.counts[option]!++; poll.mine = option; });
    },
    async comments(id: string, offset = 0): Promise<FeedComment[]> {
      if (mode !== 'demo') return await available() ? rpc('list_social_post_comments_v3', { p_post: id, p_offset: offset }) : legacy.listPostComments(id, offset);
      const state = await demoRead(); find(state, id); const rows = state.comments[id] ?? []; const roots = rows.filter(item => !item.parentId && (!item.removed || rows.some(reply => reply.parentId === item.id && !reply.removed))).slice(offset, offset + 30).map(item => item.id); return rows.filter(item => roots.includes(item.id) || (!item.removed && roots.includes(item.parentId ?? '')));
    },
    async comment(id: string, body: string, parent: string | null = null) {
      if (!body.trim() || body.trim().length > 500) throw new Error('댓글은 1~500자로 입력해 주세요.');
      if (mode !== 'demo') { if (await available()) return rpc<string>('add_social_post_comment_v3', { p_post: id, p_body: body, p_parent: parent }); if (parent) throw pending(); return legacy.addPostComment(id, body); }
      return mutate(state => { const post = find(state, id); if (post.visibility !== 'public') throw new Error('공개 글에만 댓글을 남길 수 있어요.'); const rows = state.comments[id] ??= []; if (parent && !rows.some(item => item.id === parent && !item.parentId && !item.removed)) throw new Error('답글 대상을 확인해 주세요.'); const result = crypto.randomUUID(); rows.push({ id: result, name: '나 · 로컬 데모', body: body.trim(), createdAt: new Date().toISOString(), isMine: true, authorProfileId: null, parentId: parent, likeCount: 0, viewerLiked: false, isPostAuthor: post.isMine }); post.commentCount++; return result; });
    },
    async removeComment(id: string) { if (mode !== 'demo') return legacy.removePostComment(id); return mutate(state => { for (const [postId, rows] of Object.entries(state.comments)) { const comment = rows.find(item => item.id === id); if (comment?.isMine && !comment.removed) { comment.body = ''; comment.removed = true; find(state, postId).commentCount--; return; } } throw new Error('본인 댓글만 삭제할 수 있어요.'); }); },
    async likeComment(id: string, active: boolean) { if (mode !== 'demo') { if (!(await available())) throw pending(); return rpc<void>('like_social_comment', { p_comment: id, p_active: active }); } return mutate(state => { const pair = Object.entries(state.comments).find(([, rows]) => rows.some(item => item.id === id && !item.removed)); if (!pair || find(state, pair[0]).visibility !== 'public') throw new Error('댓글을 찾을 수 없어요.'); const comment = pair[1].find(item => item.id === id)!; comment.likeCount = (comment.likeCount ?? 0) + Number(active) - Number(comment.viewerLiked); comment.viewerLiked = active; }); },
    async answers(id: string): Promise<AnonymousAnswer[]> { if (mode !== 'demo') { if (!(await available())) return []; return rpc('list_social_answers', { p_post: id }); } const state = await demoRead(); const post = find(state, id); return (state.answers[id] ?? []).filter(answer => !answer.hidden && (post.isMine || answer.isMine)).slice(-50).map(({ id, body, createdAt, isMine }) => ({ id, body, createdAt, isMine })); },
    async answer(id: string, body: string) { if (!body.trim() || body.trim().length > 500) throw new Error('익명 응답은 1~500자로 입력해 주세요.'); if (mode !== 'demo') { if (!(await available())) throw pending(); return rpc<string>('answer_social_question', { p_post: id, p_body: body }); } return mutate(state => { const post = find(state, id); const rows = state.answers[id] ??= []; if (rows.some(answer => answer.isMine)) throw new Error('이미 응답했어요.'); if (!post.question?.canAnswer || post.visibility !== 'public') throw new Error('팔로우한 공개 글에만 응답할 수 있어요.'); const result = crypto.randomUUID(); rows.push({ id: result, body: body.trim(), createdAt: new Date().toISOString(), isMine: true }); post.question.count++; return result; }); },
    async hideAnswer(id: string) { if (mode !== 'demo') return rpc<void>('hide_social_answer', { p_id: id }); return mutate(state => { for (const [postId, rows] of Object.entries(state.answers)) { const answer = rows.find(item => item.id === id); if (answer && (answer.isMine || find(state, postId).isMine)) { if (!answer.hidden) find(state, postId).question!.count--; answer.hidden = true; return; } } throw new Error('응답을 숨길 수 없어요.'); }); },
    async follow(post: FeedPost) { if (mode !== 'demo') { if (post.authorProfileId) await legacy.followMember(post.authorProfileId, !post.viewerFollows); return; } return mutate(state => { const value = find(state, post.id); value.viewerFollows = !value.viewerFollows; if (value.question) value.question.canAnswer = !value.isMine && Boolean(value.viewerFollows) && !value.question.answered; }); },
  };
}
export type FeedApi = ReturnType<typeof createFeedApi>;
