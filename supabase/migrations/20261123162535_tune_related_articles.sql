-- Avoid compiling this short, bounded query on each article detail request.
alter function public.capture_related_articles(uuid) set jit = off;
