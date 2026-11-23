import { listArticles } from "../articles/list";

export function GET(request: Request) {
  return listArticles(request, true);
}
