import { listArticles } from "./list";

export function GET(request: Request) {
  return listArticles(request);
}
