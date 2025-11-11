# @fac/dynamic-form

Dynamic, data-driven form renderer for React projects. Ships with file uploads, drag & drop support, required field enforcement, and a tiny submission hook so you can plug it into any backend quickly.

## Features

- Render any combination of text, textarea, select, radio, checkbox, and file fields with a simple JSON config.
- Built-in drag & drop uploader with preview and “keep existing files” support.
- Automatic FormData → JSON serialization (supports repeated keys and nested targets).
- Extensible field transforms so you can massage values before they hit your API.
- Optional redirect, toast, or side effects through callbacks.

## Installation

```bash
pnpm add @fac/dynamic-form
# or
npm install @fac/dynamic-form
```

Inside a pnpm workspace you can also depend on it via `workspace:*`.

## Quick Start

```tsx
import { DynamicForm } from '@fac/dynamic-form'

const fields = [
  { name: 'title', label: 'Project', type: 'text', required: true },
  { name: 'summary', label: 'Summary', type: 'textarea', rows: 4 },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'in_progress', label: 'In progress' },
    ],
  },
  {
    name: 'photos',
    label: 'Photos',
    type: 'file',
    multiple: true,
    accept: 'image/*',
  },
]

export default function Example() {
  return (
    <DynamicForm
      title="Create project"
      fields={fields}
      submitUrl="/api/projects"
      uploadUrl="/api/upload"
      onSuccess={() => console.log('saved')}
    />
  )
}
```

## Field Options

Each entry in `fields` accepts:

| Name | Type | Description |
| --- | --- | --- |
| `name` | `string` | Unique key stored in the payload |
| `label` | `string` | Visible label |
| `type` | `'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file'` | Field renderer |
| `options` | `{ value: string \| number, label: string }[]` | Required for select/checkbox/radio |
| `description` | `string` | Helper text |
| `required` | `boolean` | Adds native required and client validation |
| `placeholder` | `string` | Placeholder where applicable |
| `rows` | `number` | Only for textarea |
| `accept` | `string` | File input accept attribute |
| `multiple` | `boolean` | Allow multiple values or uploads |
| `mapTo` | `string` | Persist value under a different key (useful for workers arrays, etc.) |
| `transformValue` | `(value: any, context) => any` | Modify value before it's persisted |

When you set `multiple: true` the final payload stores an array.

## Uploads

Pass `uploadUrl` to enable built-in uploads. The component will call `fetch(uploadUrl, { method: 'POST', body: FormData })` and expect an array response like `[{ id: 1, url: '/uploads/file.jpg' }]`. Override this behavior via `uploadRequest` prop if your API differs.

## Advanced Usage

- `renderField` prop lets you fully control how a field renders.
- `valueSerializers` let you register functions per field name to normalize FormData values.
- `beforeSubmit` hook lets you inspect the computed payload before the network call.

See `docs/DYNAMIC_FORM_PACKAGE.md` in the main repo for the full deep dive.
