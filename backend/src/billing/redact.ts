/** Recorta el valor del query param `key` de una URL para poder loguearla sin exponer la clave. */
export function redactUrl(url: string): string {
  return url.replace(/([?&]key=)[^&#]*/gi, '$1***');
}

/** Sanitiza un mensaje de error por si una URL sin redactar se coló en él. */
export function redactMessage(message: string): string {
  return message
    .replace(/(https?:\/\/[^\s]*[?&]key=)[^&#\s]*/gi, '$1***')
    .replace(/([?&]key=)[^&#\s]*/gi, '$1***');
}