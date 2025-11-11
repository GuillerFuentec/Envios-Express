# @raccoonstudiosllc/address-capture

Incluye autocompletado, normalización del estado de la dirección y vista previa lista para firmar. Todo el
código es agnóstico al backend: solamente necesitas inyectar funciones que obtengan sugerencias y detalles de
la dirección (por ejemplo, tus endpoints `/api/address/suggest` y `/api/address/details`).

## Características
- Entrada completa (líneas, ciudad, estado, CP) con el mismo UX del funnel de registro.
- Debounce integrado y navegación con teclado para los resultados tipo Google Places.
- Normalización de valores (`line1`, `line2`, `locality`, `adminArea`, `postalCode`, `countryCode`, `normalized`).
- Vista previa del formato final y API de errores para integrar validaciones externas.
- Sistema de `labels`, `fieldLabels` y `ui` para personalizar textos y clases sin tocar el componente.

## Instalación

```bash
pnpm add @raccoonstudiosllc/address-capture
# o yarn/npm según tu stack
```

## Uso básico

```jsx
import { useState } from "react";
import {
  AddressCaptureInput,
  createEmptyAddress,
} from "@raccoonstudiosllc/address-capture";

export function AddressStep() {
  const [address, setAddress] = useState(createEmptyAddress());

  const fetchSuggestions = async (query) => {
    const res = await fetch(`/api/address/suggest?q=${encodeURIComponent(query)}`);
    const payload = await res.json();
    return (payload?.suggestions ?? []).map((item) => ({
      id: item.placeId,
      description: item.description,
      placeId: item.placeId,
    }));
  };

  const fetchDetails = async (suggestion) => {
    const res = await fetch("/api/address/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId: suggestion.placeId }),
      credentials: "include",
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.error || "No se pudo recuperar la dirección.");
    }
    return res.json();
  };

  return (
    <AddressCaptureInput
      value={address}
      onChange={setAddress}
      fetchSuggestions={fetchSuggestions}
      fetchDetails={fetchDetails}
      errors={{ line1: address.line1 ? null : "Requerido" }}
      labels={{ previewLabel: "Dirección principal" }}
    />
  );
}
```

## Props principales

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `value` | `Address` | Estado actual de la dirección. Usa `createEmptyAddress()` para inicializar. |
| `onChange` | `(address) => void` | Se dispara en cada cambio con el objeto normalizado. |
| `fetchSuggestions` | `(query: string) => Promise<Suggestion[]>` | Regresa las sugerencias para el campo `line1`. Si no se define, el componente funciona como inputs normales. |
| `fetchDetails` | `(suggestion) => Promise<Partial<Address>>` | Convierte la sugerencia seleccionada en datos concretos (líneas, ciudad, coordenadas, etc.). Opcional. |
| `disabled` | `boolean` | Desactiva toda la UI. |
| `errors` | `Record<string, string>` | Mensajes por campo (`line1`, `line2`, `locality`, `adminArea`, `postalCode`, `general`). |
| `labels` | `Partial<{ previewLabel, previewEmpty, suggestionSearching, suggestionError }>` | Textos generales. |
| `fieldLabels` | `Partial<Record<FieldKey, FieldConfig>>` | Sobrescribe `label`, `placeholder`, `hint`, etc. de cada campo. |
| `ui` | `Partial<UIClasses>` | Cambia las clases CSS generadas (`container`, `grid`, `input`, `suggestions`, etc.). |
| `minSuggestLength` | `number` | Número mínimo de caracteres antes de pedir sugerencias (default 3). |
| `suggestDebounceMs` | `number` | Tiempo de debounce para `fetchSuggestions` (default 150 ms). |
| `suggestionLimit` | `number` | Máximo de ítems mostrados (default 8). |
| `showPreview` | `boolean` | Muestra u oculta el cuadro con `formatAddressForDisplay`. |
| `onError` | `(error: Error) => void` | Callback para propagar errores de `fetchSuggestions` o `fetchDetails`. |

### Shape de `Address`

```ts
interface Address {
  line1: string;
  line2: string;
  locality: string;
  adminArea: string;
  postalCode: string;
  countryCode: string; // Default US
  normalized: null | {
    line1?: string;
    line2?: string;
    locality?: string;
    adminArea?: string;
    postalCode?: string;
    countryCode?: string;
    lat?: number;
    lng?: number;
    full?: string; // cadena lista para mostrar
  };
}
```

### Shape de `Suggestion`

```ts
interface Suggestion {
  id?: string;
  placeId?: string; // útil con Google Places
  description?: string;
  label?: string;
  [key: string]: unknown; // metadata propia del proveedor
}
```

## Utilidades exportadas

- `createEmptyAddress()` – genera el objeto base.
- `normalizeAddressState(value)` – asegura el formato correcto sin importar la forma de entrada.
- `formatAddressForDisplay(value)` – crea una cadena amigable usando datos normalizados.
- `isEmptyAddress(value)` – ayuda para validaciones personalizadas.

## Notas de integración

1. El componente no realiza llamadas de red por sí solo; todo se delega a `fetchSuggestions` y `fetchDetails`, por lo que puedes usar Google Places, Mapbox, tu propia base, etc.
2. Para proyectos Next.js agrega el package al arreglo `transpilePackages` (si usas el app router) para que SWC procese el JSX del componente.
3. Si necesitas múltiples direcciones dinámicas, puedes envolver `AddressCaptureInput` dentro de tu propio repeater usando el mismo state shape.
