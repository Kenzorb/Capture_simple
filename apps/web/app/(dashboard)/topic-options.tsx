import type { Topic } from "@capture/shared";

export function TopicOptions({
  topics,
  exclude,
}: {
  topics: Topic[];
  exclude?: string;
}) {
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const options = topics.flatMap((topic) => {
    const path: string[] = [];
    let current: Topic | undefined = topic;
    while (current && path.length < 4) {
      if (current.id === exclude) return [];
      path.unshift(current.name);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
    return [{ id: topic.id, label: path.join(" / ") }];
  });
  return options
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(({ id, label }) => (
      <option key={id} value={id}>
        {label}
      </option>
    ));
}
