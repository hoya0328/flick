/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/202608110002_stage5b_collections.sql', 'utf8');
const home = readFileSync('src/app/(tabs)/index.tsx', 'utf8');
const collections = readFileSync('src/app/collections.tsx', 'utf8');
const picker = readFileSync('src/app/collection-picker.tsx', 'utf8');
const detail = readFileSync('src/app/collection/[id].tsx', 'utf8');
const movieDetail = readFileSync('src/app/movie/[id].tsx', 'utf8');

describe('Stage 5B responsive feed and collections contract', () => {
  it('keeps collections private by default and owner mutations behind RPCs', () => {
    expect(migration).toContain("visibility text not null default 'private'");
    expect(migration).toContain('where id = p_collection_id and user_id = auth.uid()');
    expect(migration).toContain('revoke all on public.movie_collections from anon, authenticated');
    expect(migration).toContain('collections.visibility = \'public\' or collections.user_id = auth.uid()');
  });

  it('deduplicates collection movies and saves and caps collection size', () => {
    expect(migration).toContain('primary key (collection_id, movie_id)');
    expect(migration).toContain('primary key (collection_id, user_id)');
    expect(migration).toContain("raise exception 'collection_full'");
    expect(migration).toContain('on conflict do nothing');
  });

  it('separates Light cards and Core magazine entries on the home feed', () => {
    expect(home).toContain("listPublicReviewFeed('light'");
    expect(home).toContain("listPublicReviewFeed('core'");
    expect(home).toContain('가볍게 기록한 리뷰');
    expect(home).toContain('집중 기록 매거진');
    expect(home).toContain('toggleReviewLike');
    expect(home).toContain('toggleReviewSave');
  });

  it('connects collection create, edit, visibility, movie add, remove, and save UI', () => {
    expect(collections).toContain('saveMovieCollection');
    expect(collections).toContain('나만 보기');
    expect(collections).toContain('전체 공개');
    expect(picker).toContain('addMovieToCollection');
    expect(detail).toContain('removeMovieFromCollection');
    expect(detail).toContain('setMovieCollectionSaved');
    expect(collections).toContain('listSavedCollections');
    expect(migration).toContain('list_saved_collections');
    expect(movieDetail).toContain('내 컬렉션에 담기');
  });
});
