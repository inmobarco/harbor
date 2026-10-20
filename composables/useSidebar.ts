import { useLocalStorage } from '@vueuse/core'

/**
 * Menu lateral desplegable. Se recuerda por navegador: quien lo cierra para
 * ganar espacio (p. ej. en el tablero de mantenimiento) lo encuentra igual.
 * Si el almacenamiento no esta disponible, arranca abierto.
 */
export function useSidebar() {
  const open = useLocalStorage('harbor_sidebar_open', true)

  function toggle() {
    open.value = !open.value
  }

  return { open, toggle }
}
