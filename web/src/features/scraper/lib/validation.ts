export function validateImdb(imdb: string) {
  if (!/^tt\d{5,}$/.test(imdb)) throw new Error("Invalid imdb_id");
}
