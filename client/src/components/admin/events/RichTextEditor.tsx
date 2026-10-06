"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const CustomImage = Node.create({
  name: "image",
  group: "inline",
  inline: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      class: {
        default: "rounded-xl max-w-full h-auto my-3 block shadow-sm border border-[#e0e7f0]",
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", HTMLAttributes];
  },
  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    } as any;
  },
});

const sizes = [12, 14, 16, 18, 20, 24, 28, 32];
const colors = ["#102a50", "#154a9b", "#bd3343", "#1f7a4d", "#7c3aed", "#b45309"];

export function RichTextEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}) {
  const { message } = useLanguage();
  const t = message.editor;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontSize,
      CustomImage,
      Link.configure({ openOnClick: false, protocols: ["http", "https", "mailto"] }),
    ],
    content: value,
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML()),
    editorProps: { attributes: { class: "event-rich-content min-h-44 px-4 py-3 outline-none" } },
  });
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);
  if (!editor) return <div className="min-h-44 rounded-xl border border-[#d9e2ed] bg-[#f7f9fc]" />;
  const button =
    "rounded-lg border border-[#d9e2ed] bg-white px-2.5 py-1.5 text-xs font-bold text-[#263b58] hover:border-[#9fb7d5] disabled:opacity-40";
  const link = () => {
    const current = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt(t.linkPrompt, current ?? "https://");
    if (href === null) return;
    if (!href.trim()) editor.chain().focus().unsetLink().run();
    else
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: href.trim(), target: "_blank" })
        .run();
  };

  const insertImageUrl = () => {
    const url = window.prompt(t.imagePrompt, "https://");
    if (!url || !url.trim()) return;
    (editor.chain().focus() as any).setImage({ src: url.trim() }).run();
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        window.alert(`Tệp "${file.name}" không phải là ảnh hợp lệ`);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        window.alert(`Ảnh "${file.name}" vượt quá 2MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (result) {
          (editor.chain().focus() as any).setImage({ src: result }).run();
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#d9e2ed] bg-white focus-within:border-[#154a9b] focus-within:ring-2 focus-within:ring-[#154a9b]/10">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageFile}
      />
      <div className="flex flex-wrap gap-1.5 border-b border-[#e6ebf2] bg-[#f7f9fc] p-2">
        <button
          type="button"
          className={button}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          className={button}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          className={button}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <u>U</u>
        </button>
        <button
          type="button"
          className={button}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <s>S</s>
        </button>
        <select
          aria-label={t.fontSize}
          className={button}
          defaultValue=""
          onChange={(e) => editor.chain().focus().setFontSize(`${e.target.value}px`).run()}
        >
          <option value="" disabled>
            {t.fontSize}
          </option>
          {sizes.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Màu ${color}`}
            className="h-7 w-7 rounded-lg border border-white shadow ring-1 ring-[#cbd5e1]"
            style={{ backgroundColor: color }}
            onClick={() => editor.chain().focus().setColor(color).run()}
          />
        ))}
        <input
          aria-label={t.textColor}
          type="color"
          className="h-7 w-8 cursor-pointer rounded"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
        {[1, 2, 3].map((level) => (
          <button
            key={level}
            type="button"
            className={button}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleHeading({ level: level as 1 | 2 | 3 })
                .run()
            }
          >
            H{level}
          </button>
        ))}
        <button
          type="button"
          className={button}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
        <button
          type="button"
          className={button}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </button>
        <button type="button" className={button} onClick={link}>
          Link
        </button>
        <button
          type="button"
          className={button}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          {t.removeLink}
        </button>
        <button type="button" className={button} onClick={insertImageUrl}>
          {t.insertImage}
        </button>
        <button type="button" className={button} onClick={() => fileInputRef.current?.click()}>
          {t.uploadImage}
        </button>
        {editor.getAttributes("link").href ? (
          <button
            type="button"
            className={button}
            onClick={() =>
              window.open(
                editor.getAttributes("link").href as string,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            {t.openLink}
          </button>
        ) : null}
        <button
          type="button"
          className={button}
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </button>
        <button
          type="button"
          className={button}
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
