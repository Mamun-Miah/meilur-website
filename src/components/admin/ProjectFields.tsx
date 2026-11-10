import { Check, Field, SelectField } from "./Form";

type Project = {
  title: string;
  year: string | null;
  category: string;
  description: string;
  client: string | null;
  location: string | null;
  status: string;
  featured: boolean;
} | null;

export function ProjectFields({ project, categories }: { project: Project; categories: string[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field name="title" label="Project title" defaultValue={project?.title} required maxLength={120} className="sm:col-span-2" />
      <Field name="year" label="Year" defaultValue={project?.year} maxLength={20} hint="For example 2025, or Summer 2024." />
      <Field name="category" label="Category" defaultValue={project?.category} required maxLength={60} list="project-categories" hint="Used by the filters on the website." />
      <datalist id="project-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <Field name="client" label="Client" defaultValue={project?.client} maxLength={120} hint="Only with the client's approval." />
      <Field name="location" label="Venue or city" defaultValue={project?.location} maxLength={120} />
      <Field name="description" label="Description" defaultValue={project?.description} multiline rows={5} maxLength={2000} className="sm:col-span-2" hint="Shown when a visitor opens the project. Stick to facts the client has approved." />
      <SelectField
        name="status"
        label="Status"
        defaultValue={project?.status ?? "DRAFT"}
        options={[
          { value: "DRAFT", label: "Draft (hidden from the website)" },
          { value: "PUBLISHED", label: "Published (on the website)" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
      />
      <div className="self-end pb-2">
        <Check name="featured" label="Featured project" defaultChecked={project?.featured} hint="Featured projects lead the Work section." />
      </div>
    </div>
  );
}
