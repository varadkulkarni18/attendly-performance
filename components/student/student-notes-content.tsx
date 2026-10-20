
"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, BookOpen, Search } from "lucide-react";

type Material = {
  id: string;
  title: string;
  className: string;
  subject: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
};

export default function StudentNotesContent() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("attendly-demo-materials");

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setMaterials(parsed as Material[]);
        }
      }
    } catch {
      setMaterials([]);
    }
  }, []);

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(materials.map((item) => item.subject)),
      ).sort(),
    [materials],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return materials.filter((item) => {
      const matchesSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.subject.toLowerCase().includes(term) ||
        item.fileName.toLowerCase().includes(term);

      const matchesSubject =
        subjectFilter === "all" ||
        item.subject === subjectFilter;

      return matchesSearch && matchesSubject;
    });
  }, [materials, search, subjectFilter]);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="border-b border-neutral-200 pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          Learning / Resources
        </p>

        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
          Notes & materials
        </h1>

        <p className="mt-2 text-sm text-neutral-600">
          Browse available study files and download a copy for your coursework.
        </p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="flex h-11 items-center gap-3 border border-neutral-300 px-3">
          <Search
            size={16}
            className="shrink-0 text-neutral-500"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles, subjects or files"
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            aria-label="Search study materials"
          />
        </label>

        <select
          value={subjectFilter}
          onChange={(event) => setSubjectFilter(event.target.value)}
          className="h-11 border border-neutral-300 bg-transparent px-3 text-sm outline-none"
          aria-label="Filter by subject"
        >
          <option value="all">All subjects</option>

          {subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between border-b border-neutral-200 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Resource library
            </p>

            <h2 className="mt-1 font-display text-2xl">
              Study files
            </h2>
          </div>

          <span className="text-xs text-neutral-500">
            {filtered.length} resources
          </span>
        </div>

        {filtered.length > 0 ? (
          <div>
            {filtered.map((material) => (
              <article
                key={material.id}
                className="flex flex-col gap-4 border-b border-neutral-200 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex size-10 shrink-0 items-center justify-center border border-neutral-200">
                  <FileText size={17} strokeWidth={1.5} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-medium">
                    {material.title}
                  </h3>

                  <p className="mt-1 text-xs text-neutral-500">
                    {material.className} · {material.subject}
                  </p>

                  <p className="mt-1 break-all text-xs text-neutral-500">
                    {material.fileName} · {material.uploadedAt}
                  </p>
                </div>

                <a
                  href={material.fileUrl}
                  download={material.fileName}
                  className="inline-flex h-9 items-center justify-center gap-2 border border-neutral-300 px-3 text-xs font-medium transition-colors hover:border-black"
                >
                  <Download size={14} strokeWidth={1.7} />
                  Download
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <BookOpen
              size={25}
              strokeWidth={1.4}
              className="mx-auto text-neutral-400"
            />

            <h3 className="mt-3 text-sm font-medium">
              {search || subjectFilter !== "all"
                ? "No matching materials"
                : "No study materials available"}
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-neutral-500">
              {search || subjectFilter !== "all"
                ? "Try another search or change the subject filter."
                : "Materials saved in this browser will appear here."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
