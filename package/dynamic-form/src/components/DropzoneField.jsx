'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'

const sameExisting = (a, b) => {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const left = a[i]?.id || a[i]?.url || a[i]
    const right = b[i]?.id || b[i]?.url || b[i]
    if (left !== right) return false
  }
  return true
}

const getExistingId = (item) => item?.id ?? item?.documentId ?? item?.uid ?? item?.url ?? null

export function DropzoneField({
  name,
  accept = '*',
  multiple = true,
  maxSize,
  onFilesChange,
  onExistingChange,
  existing = [],
  value,
  description,
}) {
  const [files, setFiles] = useState([])
  const [keptExisting, setKeptExisting] = useState(() => (Array.isArray(existing) ? existing : []))
  const changeRef = useRef(onFilesChange)
  const existingRef = useRef(onExistingChange)

  useEffect(() => {
    changeRef.current = onFilesChange
  }, [onFilesChange])

  useEffect(() => {
    existingRef.current = onExistingChange
  }, [onExistingChange])

  useEffect(() => {
    const next = Array.isArray(existing) ? existing : []
    setKeptExisting((prev) => (sameExisting(prev, next) ? prev : next))
  }, [existing])

  const currentFiles = useMemo(() => (Array.isArray(value) ? value : files), [files, value])

  useEffect(() => {
    if (!Array.isArray(value)) {
      changeRef.current?.(name, files)
    }
  }, [files, name, value])

  useEffect(() => {
    const ids = keptExisting.map((item) => getExistingId(item)).filter(Boolean)
    existingRef.current?.(name, ids)
  }, [keptExisting, name])

  const onDrop = useCallback(
    (acceptedFiles) => {
      const nextFiles = multiple ? acceptedFiles : acceptedFiles.slice(-1)
      if (Array.isArray(value)) {
        const merged = multiple ? [...value, ...nextFiles] : nextFiles
        changeRef.current?.(name, merged)
      } else {
        setFiles((prev) => (multiple ? [...prev, ...nextFiles] : nextFiles))
      }
    },
    [multiple, name, value]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({ onDrop, accept, multiple, maxFiles: multiple ? undefined : 1, maxSize })

  const removeFileAt = (index) => {
    if (Array.isArray(value)) {
      const next = value.filter((_, idx) => idx !== index)
      changeRef.current?.(name, next)
    } else {
      setFiles((prev) => prev.filter((_, idx) => idx !== index))
    }
  }

  const removeExistingAt = (index) => {
    setKeptExisting((prev) => prev.filter((_, idx) => idx !== index))
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center text-sm transition ${
          isDragActive ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-white/30 bg-white/5 text-white/70'
        }`}
      >
        <input {...getInputProps()} name={`files.${name}`} />
        <p>{isDragActive ? 'Suelta los archivos aquí…' : 'Arrastra y suelta archivos o haz clic para seleccionar'}</p>
        {description && <p className="mt-2 text-xs text-white/60">{description}</p>}
        {fileRejections.length > 0 && (
          <p className="mt-2 text-xs text-red-400">Archivo no permitido o demasiado grande.</p>
        )}
      </div>

      {keptExisting.length > 0 && (
        <section>
          <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Archivos existentes</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {keptExisting.map((item, index) => (
              <article key={`existing-${getExistingId(item) ?? index}`} className="relative rounded border border-white/10 p-3 text-sm text-white/80">
                {item?.url && item?.url.match(/\.(png|jpe?g|webp|gif)$/i) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item?.name || `media-${index}`}
                    className="mb-2 h-32 w-full rounded object-cover"
                  />
                )}
                <p className="pr-6 break-all text-xs text-white/70">{item?.name || item?.url || `media-${index}`}</p>
                <button
                  type="button"
                  onClick={() => removeExistingAt(index)}
                  className="absolute right-2 top-2 rounded bg-red-600/80 px-2 py-1 text-xs text-white"
                >
                  Quitar
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {currentFiles.length > 0 && (
        <section>
          <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Nuevos archivos</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {currentFiles.map((file, index) => (
              <article key={`new-${index}`} className="relative rounded border border-white/10 p-3 text-sm text-white/80">
                {file.type?.startsWith('image/') && (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="mb-2 h-32 w-full rounded object-cover"
                    onLoad={(event) => {
                      try {
                        URL.revokeObjectURL(event.currentTarget.src)
                      } catch (err) {
                        console.warn('Failed to revoke object URL', err)
                      }
                    }}
                  />
                )}
                <p className="pr-6 break-all text-xs text-white/70">{file.name}</p>
                <button
                  type="button"
                  onClick={() => removeFileAt(index)}
                  className="absolute right-2 top-2 rounded bg-red-600/80 px-2 py-1 text-xs text-white"
                >
                  Quitar
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
