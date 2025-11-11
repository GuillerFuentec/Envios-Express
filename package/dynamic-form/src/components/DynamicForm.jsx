'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { DropzoneField } from './DropzoneField.jsx'

const defaultFetcher = (...args) => {
  if (typeof fetch === 'function') {
    return fetch(...args)
  }
  throw new Error('No fetch implementation available. Provide a custom `fetcher`.')
}

const noop = () => {}
const identity = (value) => value

const stringsEqual = (a, b) => {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

const defaultTransformUploadResponse = (payload) => {
  if (!payload) return []
  if (Array.isArray(payload)) {
    return payload
      .map((item) => {
        if (item == null) return null
        if (typeof item === 'object') {
          return item.id ?? item._id ?? item.url ?? null
        }
        return item
      })
      .filter(Boolean)
  }
  return []
}

const defaultParseError = async (response) => {
  if (!response) return 'Request failed'
  try {
    const text = await response.text()
    if (!text) return response.statusText || 'Request failed'
    try {
      const json = JSON.parse(text)
      return json?.error?.message || json?.error || json?.message || text
    } catch (err) {
      return text
    }
  } catch (innerErr) {
    return innerErr?.message || 'Request failed'
  }
}

const hasText = (value) => {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.some((entry) => hasText(entry))
  return true
}

const slugify = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()

const mergeHeaders = (base = {}, extra = {}) => {
  const next = { ...(base || {}) }
  for (const [key, value] of Object.entries(extra || {})) {
    if (value == null) continue
    next[key] = value
  }
  return next
}

const shouldSkipField = (field) => field?.omitFromPayload

export function DynamicForm({
  fields = [],
  title,
  description,
  submitUrl,
  method = 'POST',
  fetcher = defaultFetcher,
  uploadUrl,
  uploadFetcher,
  uploadRequest,
  uploadFieldName = 'files',
  transformUploadResponse = defaultTransformUploadResponse,
  hiddenValues = {},
  defaultValues = {},
  wrapPayload = identity,
  beforeSubmit,
  valueSerializers = {},
  resetOnSuccess = true,
  redirectTo,
  requestOptions,
  headers,
  autoTrim = true,
  submitDisabled = false,
  lockedReason,
  onSuccess = noop,
  onError = noop,
  successMessage = 'Guardado correctamente',
  loadingLabel = 'Guardando…',
  submitButtonText = 'Guardar',
  cancelButtonText = 'Cancelar',
  cancelHref = '#',
  onCancel,
  showSuccessMessage = true,
  showErrorMessage = true,
  renderField,
  renderActions,
  fieldClassName = 'space-y-2',
  formClassName = 'relative text-white',
  actionsClassName = 'mt-6 flex items-center justify-end gap-4',
  fieldsetClassName = 'space-y-10',
  loadingOverlayClassName = 'absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/50',
  parseError = defaultParseError,
}) {
  if (!fields || !Array.isArray(fields)) {
    throw new Error('DynamicForm requires a fields array')
  }
  if (!submitUrl) {
    throw new Error('DynamicForm requires a submitUrl')
  }

  const [mediaFiles, setMediaFiles] = useState({})
  const [keptExisting, setKeptExisting] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const formRef = useRef(null)

  const fieldMap = useMemo(() => {
    const map = new Map()
    fields.forEach((field) => {
      if (field?.name) map.set(field.name, field)
    })
    return map
  }, [fields])

  const updateExisting = useCallback((fieldName, ids) => {
    setKeptExisting((prev) => (stringsEqual(prev[fieldName], ids) ? prev : { ...prev, [fieldName]: ids || [] }))
  }, [])

  const updateFiles = useCallback((fieldName, files) => {
    setMediaFiles((prev) => {
      if (prev[fieldName] === files) return prev
      return { ...prev, [fieldName]: Array.isArray(files) ? files : [] }
    })
  }, [])

  const validateRequiredFields = useCallback(
    (formData) => {
      const missing = []
      fields.forEach((field) => {
        if (!field?.required) return
        if (field.type === 'file') {
          const existingIds = keptExisting[field.name] || []
          const newFiles = mediaFiles[field.name] || []
          if (!existingIds.length && !newFiles.length) {
            missing.push(field.label || field.name)
          }
          return
        }

        if (field.type === 'checkbox') {
          const values = formData.getAll(field.name)
          if (!values.length || !values.some((value) => hasText(value))) {
            missing.push(field.label || field.name)
          }
          return
        }

        const value = formData.get(field.name)
        if (!hasText(value)) {
          missing.push(field.label || field.name)
        }
      })
      return missing
    },
    [fields, keptExisting, mediaFiles]
  )

  const serializeFormData = useCallback(
    (formData) => {
      const payload = {}
      const seenTargets = {}

      for (const [rawKey, rawValue] of formData.entries()) {
        if (rawKey.startsWith('files.')) continue
        const field = fieldMap.get(rawKey)
        if (shouldSkipField(field)) continue

        const targetKey = field?.mapTo || rawKey
        const serializer = valueSerializers?.[rawKey]
        let value = typeof rawValue === 'string' && autoTrim ? rawValue.trim() : rawValue
        if (field?.autoSlug && !value && formData.get(field.autoSlug.source || 'title')) {
          value = slugify(formData.get(field.autoSlug.source || 'title'))
        }
        if (typeof field?.transformValue === 'function') {
          value = field.transformValue(value, { field, formData, targetKey })
        }
        if (typeof serializer === 'function') {
          value = serializer(value, { field, formData, targetKey })
        }

        if (targetKey in payload) {
          if (!Array.isArray(payload[targetKey])) {
            payload[targetKey] = [payload[targetKey]]
          }
          payload[targetKey].push(value)
        } else {
          const shouldForceArray = field?.forceArray || field?.type === 'checkbox' || field?.multiple
          if (shouldForceArray) {
            payload[targetKey] = value == null ? [] : [value]
          } else {
            payload[targetKey] = value
          }
        }

        seenTargets[targetKey] = field?.unique || seenTargets[targetKey]
      }

      Object.entries(valueSerializers || {}).forEach(([key, serializer]) => {
        if (typeof serializer === 'function' && !(key in payload)) {
          const field = fieldMap.get(key)
          payload[key] = serializer(undefined, { field, formData, targetKey: key })
        }
      })

      Object.entries(seenTargets).forEach(([key, isUnique]) => {
        if (isUnique && Array.isArray(payload[key])) {
          payload[key] = Array.from(new Set(payload[key].filter((item) => item != null)))
        }
      })

      return payload
    },
    [autoTrim, fieldMap, valueSerializers]
  )

  const uploadAllMedia = useCallback(
    async () => {
      const uploads = {}
      const uploader = uploadRequest || (async (fieldName, files, field) => {
        const targetUrl = field?.uploadUrl || uploadUrl
        if (!targetUrl) {
          throw new Error('File field detected but no uploadUrl/uploadRequest provided')
        }
        const body = new FormData()
        files.forEach((file) => body.append(field?.uploadFieldName || uploadFieldName, file))
        const fetchImpl = field?.uploadFetcher || uploadFetcher || fetcher
        const response = await fetchImpl(targetUrl, {
          method: field?.uploadMethod || 'POST',
          body,
          ...(field?.uploadRequestInit || {}),
        })
        if (!response?.ok) {
          const message = await parseError(response)
          throw new Error(message || 'Upload failed')
        }
        const data = await response.json().catch(() => null)
        return transformUploadResponse(data, { fieldName, field })
      })

      for (const [fieldName, files] of Object.entries(mediaFiles)) {
        if (!Array.isArray(files) || files.length === 0) continue
        const field = fieldMap.get(fieldName)
        uploads[fieldName] = await uploader(fieldName, files, field)
      }

      return uploads
    },
    [fetcher, fieldMap, mediaFiles, parseError, transformUploadResponse, uploadFetcher, uploadFieldName, uploadRequest, uploadUrl]
  )

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setError('')
      setSuccess(false)

      if (submitDisabled) {
        const reason = lockedReason || 'Form submission is currently locked.'
        setError(reason)
        return
      }

      if (formRef.current && typeof formRef.current.checkValidity === 'function') {
        const valid = formRef.current.checkValidity()
        if (!valid) {
          formRef.current.reportValidity?.()
          return
        }
      }

      const formData = new FormData(formRef.current)
      const missing = validateRequiredFields(formData)
      if (missing.length) {
        setError(`Faltan campos requeridos: ${missing.join(', ')}`)
        return
      }

      setLoading(true)

      try {
        const payload = serializeFormData(formData)

        for (const [key, value] of Object.entries(hiddenValues || {})) {
          payload[key] = value
        }

        const uploads = await uploadAllMedia()

        fields
          .filter((field) => field.type === 'file')
          .forEach((field) => {
            const existingIds = keptExisting[field.name] || []
            const newIds = uploads[field.name] || []
            if (existingIds.length || newIds.length) {
              const combined = [...existingIds, ...newIds]
              payload[field.mapTo || field.name] = field?.unique ? Array.from(new Set(combined)) : combined
            }
          })

        if (!payload.slug && payload.title) {
          payload.slug = slugify(payload.title)
        }

        if (typeof beforeSubmit === 'function') {
          await beforeSubmit(payload, { fields, formRef, formData })
        }

        const body = JSON.stringify(wrapPayload(payload, { fields, formRef, formData }))
        const finalHeaders = mergeHeaders({ 'Content-Type': 'application/json' }, headers)
        const finalInit = {
          method,
          body,
          ...requestOptions,
          headers: mergeHeaders(finalHeaders, requestOptions?.headers),
        }

        const response = await fetcher(submitUrl, finalInit)
        if (!response?.ok) {
          const message = await parseError(response)
          throw new Error(message)
        }

        onSuccess(response, { payload, formRef, formData })
        setSuccess(true)

        if (resetOnSuccess) {
          formRef.current?.reset()
          setMediaFiles({})
          setKeptExisting({})
        }

        if (redirectTo && typeof window !== 'undefined') {
          window.location.assign(redirectTo)
        }
      } catch (err) {
        const message = err?.message || 'Algo salió mal, inténtalo de nuevo.'
        setError(message)
        onError(err, { formRef })
      } finally {
        setLoading(false)
      }
    },
    [
      beforeSubmit,
      fetcher,
      fields,
      headers,
      hiddenValues,
      keptExisting,
      lockedReason,
      parseError,
      redirectTo,
      requestOptions,
      resetOnSuccess,
      serializeFormData,
      submitDisabled,
      submitUrl,
      transformUploadResponse,
      uploadAllMedia,
      validateRequiredFields,
      wrapPayload,
      onSuccess,
      onError,
    ]
  )

  const renderDefaultField = (field) => {
    const commonProps = {
      id: field.name,
      name: field.name,
      required: Boolean(field.required),
      'aria-required': field.required ? 'true' : undefined,
      defaultValue: defaultValues?.[field.name] ?? field.defaultValue ?? '',
      placeholder: field.placeholder,
      autoComplete: field.autoComplete,
    }

    if (field.render) {
      return field.render({ field, defaultValue: defaultValues?.[field.name], commonProps })
    }

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={field.rows || 3}
            className={field.inputClassName || 'w-full rounded-md border border-white/20 bg-transparent p-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400'}
          />
        )
      case 'select':
        return (
          <select
            {...commonProps}
            defaultValue={defaultValues?.[field.name] ?? ''}
            className={field.inputClassName || 'w-full rounded-md border border-white/20 bg-gray-900/60 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400'}
          >
            <option disabled value="">
              {field.placeholder || 'Selecciona una opción'}
            </option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">
                {opt.label}
              </option>
            ))}
          </select>
        )
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-white/90">
                <input
                  type="checkbox"
                  name={field.name}
                  value={opt.value}
                  defaultChecked={Array.isArray(defaultValues?.[field.name]) && defaultValues[field.name].includes(opt.value)}
                  className="h-4 w-4 rounded border-white/30 bg-transparent text-indigo-500 focus:ring-indigo-400"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-white/90">
                <input
                  type="radio"
                  name={field.name}
                  value={opt.value}
                  defaultChecked={defaultValues?.[field.name] === opt.value}
                  className="h-4 w-4 border-white/30 text-indigo-500 focus:ring-indigo-400"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )
      case 'file':
        return (
          <DropzoneField
            name={field.name}
            accept={field.accept}
            multiple={field.multiple}
            maxSize={field.maxSize}
            onFilesChange={updateFiles}
            onExistingChange={updateExisting}
            existing={Array.isArray(defaultValues?.[field.name]) ? defaultValues[field.name] : []}
            description={field.description}
          />
        )
      default:
        return (
          <input
            {...commonProps}
            type={field.type || 'text'}
            className={field.inputClassName || 'w-full rounded-md border border-white/20 bg-gray-950/70 p-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400'}
            {...(field.inputProps || {})}
          />
        )
    }
  }

  const defaultActions = (
    <div className={actionsClassName}>
      {showErrorMessage && error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      {showSuccessMessage && success && <p className="text-sm text-green-400">{successMessage}</p>}
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-red-500"
        >
          {cancelButtonText}
        </button>
      ) : (
        <a
          href={cancelHref}
          className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-red-500"
        >
          {cancelButtonText}
        </a>
      )}
      <button
        disabled={loading || submitDisabled}
        type="submit"
        title={submitDisabled ? lockedReason || 'Form locked' : undefined}
        className={`rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${(loading || submitDisabled) ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        {loading ? loadingLabel : submitButtonText}
      </button>
    </div>
  )

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={formClassName}>
      {loading && (
        <div className={loadingOverlayClassName}>
          <span className="rounded-full border-4 border-white/30 border-t-transparent p-6 text-white" aria-live="polite">
            {loadingLabel}
          </span>
        </div>
      )}

      <div className={fieldsetClassName}>
        {(title || description) && (
          <header className="space-y-2">
            {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
            {description && <p className="text-sm text-white/70">{description}</p>}
          </header>
        )}

        {fields.map((field) => (
          <div key={field.name} className={fieldClassName}>
            {field.label && (
              <label htmlFor={field.name} className="text-sm font-medium text-white">
                {field.label}
              </label>
            )}
            <div className="space-y-2">
              {renderField ? renderField({ field, defaultRenderer: () => renderDefaultField(field), updateFiles, updateExisting, defaultValues }) : renderDefaultField(field)}
              {field.description && field.type !== 'file' && (
                <p className="text-sm text-white/60">{field.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {renderActions ? renderActions({ error, success, loading }) : defaultActions}
    </form>
  )
}
