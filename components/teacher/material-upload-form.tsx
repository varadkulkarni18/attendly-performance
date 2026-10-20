
"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Trash2, Upload, BookOpen } from "lucide-react";

type Material = {
  id: string;
  title: string;
  className: string;
  subject: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
};

const STORAGE_KEY = "attendly-demo-materials";

const classes = [
  {
    name: "TY CSE A",
    subjects: [
      "Database Management",
      "Computer Networks",
      "Operating Systems",
    ],
  },
  {
    name: "TY CSE B",
    subjects: [
      "Database Management",
      "Java Programming",
      "Software Engineering",
    ],
  },
  {
    name: "SY CSE A",
    subjects: [
      "Data Structures",
      "Digital Electronics",
      "Mathematics",
    ],
  },
];

const inputClass =
  "h-10 w-full border border-neutral-300 bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400";

const labelClass =
  "mb-2 block text-xs font-medium text-neutral-700";

export default function MaterialUploadForm() {
  const [title, setTitle] = useState("");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMaterials(JSON.parse(saved));
    } catch {
      setMessageType("error");
      setMessage("Could not load saved demo materials.");
    }
  }, []);

  const selectedClass = classes.find((item) => item.name === className);

  const selectedFilterClass = classes.find(
    (item) => item.name === filterClass,
  );

  function showMessage(
    text: string,
    type: "success" | "error" = "success",
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!title.trim() || !className || !subject || !file) {
      showMessage("Complete all fields and select a file.", "error");
      return;
    }

    // Browser-only demo storage. No server upload is performed.
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        showMessage("Could not read this file. Please try again.", "error");
        return;
      }

      const material: Material = {
        id: crypto.randomUUID(),
        title: title.trim(),
        className,
        subject,
        fileName: file.name,
        fileUrl: reader.result,
        uploadedAt: new Date().toLocaleDateString("en-IN"),
      };

      const updated = [material, ...materials];

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setMaterials(updated);
        setTitle("");
        setSubject("");
        setFile(null);
        event.currentTarget?.reset?.();
        showMessage("Material uploaded successfully.");
      } catch {
        showMessage(
          "Browser storage is full. Try a smaller file.",
          "error",
        );
      }
    };

    reader.onerror = () => {
      showMessage("Could not read this file. Please try again.", "error");
    };

    reader.readAsDataURL(file);
  }

  function deleteMaterial(id: string) {
    const updated = materials.filter((item) => item.id !== id);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setMaterials(updated);
      showMessage("Material deleted.");
    } catch {
      showMessage("Could not update browser storage.", "error");
    }
  }

  const filteredMaterials = materials.filter(
    (item) =>
      (!filterClass || item.className === filterClass) &&
      (!filterSubject || item.subject === filterSubject),
  );

  return (
    <div className="space-y-9">
      {/* Upload form */}
      <section>
        <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Resources / Upload
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-tight">
              Add study material
            </h2>
          </div>

          <FileText
            size={19}
            strokeWidth={1.5}
            className="mb-1 shrink-0 text-neutral-500"
            aria-hidden="true"
          />
        </div>

        <form onSubmit={handleUpload} className="mt-5 space-y-5">
          <div>
            <label htmlFor="material-title" className={labelClass}>
              Material title
            </label>
            <input
              id="material-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Unit 1 — Introduction to DBMS"
              className={inputClass}
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="material-class" className={labelClass}>
                Class
              </label>
              <select
                id="material-class"
                value={className}
                onChange={(event) => {
                  setClassName(event.target.value);
                  setSubject("");
                }}
                className={inputClass}
                required
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="material-subject" className={labelClass}>
                Subject
              </label>
              <select
                id="material-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                disabled={!selectedClass}
                className={inputClass}
                required
              >
                <option value="">Select subject</option>
                {selectedClass?.subjects.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="material-file" className={labelClass}>
              Attachment
            </label>
            <input
              id="material-file"
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png"
              onChange={(event) =>
                setFile(event.target.files?.[0] ?? null)
              }
              className="block w-full border border-neutral-300 text-sm text-neutral-700 file:mr-4 file:border-0 file:border-r file:border-neutral-300 file:bg-neutral-50 file:px-4 file:py-2.5 file:text-xs file:font-medium file:text-neutral-800 hover:file:bg-neutral-100"
              required
            />
            {file && (
              <p className="mt-2 text-xs text-neutral-500">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
              PDF, PowerPoint, Word, text, and image files. Demo storage is
              limited by your browser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-neutral-200 pt-4">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 bg-black px-4 text-sm text-white transition-colors hover:bg-neutral-800"
            >
              <Upload size={14} strokeWidth={1.8} />
              Upload material
            </button>

            {message && (
              <p
                role="status"
                className={`text-xs ${
                  messageType === "error"
                    ? "text-red-700"
                    : "text-neutral-600"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </form>
      </section>

      {/* Uploaded materials */}
      <section>
        <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Resource library
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-tight">
              Uploaded materials
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {filteredMaterials.length}{" "}
              {filteredMaterials.length === 1 ? "resource" : "resources"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              aria-label="Filter materials by class"
              value={filterClass}
              onChange={(event) => {
                setFilterClass(event.target.value);
                setFilterSubject("");
              }}
              className={`${inputClass} sm:min-w-40`}
            >
              <option value="">All classes</option>
              {classes.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter materials by subject"
              value={filterSubject}
              onChange={(event) => setFilterSubject(event.target.value)}
              disabled={!selectedFilterClass}
              className={`${inputClass} sm:min-w-44`}
            >
              <option value="">All subjects</option>
              {selectedFilterClass?.subjects.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="py-12 text-center">
            <BookOpen
              size={24}
              strokeWidth={1.3}
              className="mx-auto text-neutral-400"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-neutral-800">
              No materials found
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Upload a resource or change your class and subject filters.
            </p>
          </div>
        ) : (
          <div>
            {filteredMaterials.map((material) => (
              <article
                key={material.id}
                className="flex flex-col gap-4 border-b border-neutral-200 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center border border-neutral-200">
                    <FileText
                      size={17}
                      strokeWidth={1.5}
                      className="text-neutral-600"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-medium text-neutral-900">
                      {material.title}
                    </h3>
                    <p className="mt-1 text-xs text-neutral-600">
                      {material.className} · {material.subject}
                    </p>
                    <p className="mt-1 break-all text-xs text-neutral-500">
                      {material.fileName} · {material.uploadedAt}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:pl-4">
                  <a
                    href={material.fileUrl}
                    download={material.fileName}
                    className="inline-flex h-9 items-center gap-2 border border-neutral-300 px-3 text-xs font-medium transition-colors hover:border-black"
                  >
                    <Download size={14} strokeWidth={1.7} />
                    Download
                  </a>

                  <button
                    type="button"
                    onClick={() => deleteMaterial(material.id)}
                    aria-label={`Delete ${material.title}`}
                    className="flex size-9 items-center justify-center border border-neutral-200 text-neutral-600 transition-colors hover:border-red-300 hover:text-red-700"
                  >
                    <Trash2 size={14} strokeWidth={1.7} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
