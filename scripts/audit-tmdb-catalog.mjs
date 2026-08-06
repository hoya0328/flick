import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';

const now = new Date();
const date = process.argv.find((value) => value.startsWith('--date='))?.slice(7)
  ?? `${String(now.getUTCMonth() + 1).padStart(2, '0')}_${String(now.getUTCDate()).padStart(2, '0')}_${now.getUTCFullYear()}`;
const url = `https://files.tmdb.org/p/exports/movie_ids_${date}.json.gz`;
const response = await fetch(url);
if (!response.ok || !response.body) throw new Error(`TMDB export unavailable: ${response.status} ${url}`);

const lines = createInterface({ input: Readable.fromWeb(response.body).pipe(createGunzip()), crlfDelay: Infinity });
let validMovies = 0;
let excludedAdult = 0;
let excludedVideo = 0;
let projectedRowBytes = 0;

for await (const line of lines) {
  if (!line.trim()) continue;
  const item = JSON.parse(line);
  if (item.adult) {
    excludedAdult += 1;
    continue;
  }
  if (item.video) {
    excludedVideo += 1;
    continue;
  }
  validMovies += 1;
  projectedRowBytes += Buffer.byteLength(item.original_title ?? '', 'utf8') + 128;
}

const projectedDatabaseMb = Math.ceil((projectedRowBytes * 1.7) / 1024 / 1024);
console.log(JSON.stringify({
  date,
  excludedAdult,
  excludedVideo,
  projectedDatabaseMb,
  source: url,
  validMovies,
  warning: 'Estimate includes lightweight rows and basic indexes only. Do not import on Supabase Free when projection approaches 500 MB.',
}, null, 2));
