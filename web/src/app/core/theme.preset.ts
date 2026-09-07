import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Aura, retuned: an indigo primary on a cool slate surface, softer corners, and a visible focus
 * halo on every control. Colours are written with light-dark() the way Aura writes its own, so a
 * single definition covers both schemes and the dark selector only has to flip color-scheme.
 */
export const appPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '3px',
      sm: '6px',
      md: '8px',
      lg: '10px',
      xl: '14px',
    },
  },
  semantic: {
    transitionDuration: '0.15s',

    primary: {
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.500}',
      600: '{indigo.600}',
      700: '{indigo.700}',
      800: '{indigo.800}',
      900: '{indigo.900}',
      950: '{indigo.950}',
      color: 'light-dark({indigo.600}, {indigo.400})',
      contrastColor: 'light-dark(#ffffff, {surface.950})',
      hoverColor: 'light-dark({indigo.700}, {indigo.300})',
      activeColor: 'light-dark({indigo.800}, {indigo.200})',
    },

    // One cool grey in both schemes, so a card never drifts warm against the page behind it.
    surface: {
      0: '#ffffff',
      50: '{slate.50}',
      100: '{slate.100}',
      200: '{slate.200}',
      300: '{slate.300}',
      400: '{slate.400}',
      500: '{slate.500}',
      600: '{slate.600}',
      700: '{slate.700}',
      800: '{slate.800}',
      900: '{slate.900}',
      950: '{slate.950}',
    },

    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.color}',
      offset: '2px',
      shadow: 'none',
    },

    content: {
      borderRadius: '{border.radius.xl}',
      background: 'light-dark({surface.0}, {surface.900})',
      hoverBackground: 'light-dark({surface.50}, {surface.800})',
      borderColor: 'light-dark({surface.200}, {surface.800})',
    },

    formField: {
      paddingX: '0.75rem',
      paddingY: '0.55rem',
      borderRadius: '{border.radius.lg}',
      borderColor: 'light-dark({surface.300}, {surface.700})',
      hoverBorderColor: 'light-dark({surface.400}, {surface.600})',
      background: 'light-dark({surface.0}, {surface.900})',
      // A tinted halo rather than a hard outline: it reads as focus without shouting.
      focusRing: {
        width: '3px',
        style: 'solid',
        color: 'color-mix(in srgb, {primary.color}, transparent 78%)',
        offset: '0',
        shadow: 'none',
      },
      shadow: '0 1px 2px 0 light-dark(rgb(15 23 42 / 0.04), rgb(0 0 0 / 0.2))',
    },

    list: {
      option: {
        borderRadius: '{border.radius.md}',
      },
    },

    overlay: {
      select: {
        borderRadius: '{border.radius.lg}',
        shadow:
          '0 10px 15px -3px light-dark(rgb(15 23 42 / 0.1), rgb(0 0 0 / 0.5)), 0 4px 6px -4px light-dark(rgb(15 23 42 / 0.1), rgb(0 0 0 / 0.4))',
      },
      popover: {
        borderRadius: '{border.radius.xl}',
      },
      modal: {
        borderRadius: '{border.radius.xl}',
        padding: '1.5rem',
        shadow: '0 25px 50px -12px light-dark(rgb(15 23 42 / 0.25), rgb(0 0 0 / 0.6))',
      },
    },

    mask: {
      background: 'light-dark(rgb(15 23 42 / 0.35), rgb(2 6 23 / 0.7))',
    },
  },

  components: {
    button: {
      root: {
        borderRadius: '{border.radius.lg}',
        gap: '0.5rem',
        paddingX: '0.9rem',
        paddingY: '0.55rem',
        iconOnlyWidth: '2.35rem',
        label: { fontWeight: '600' },
        sm: { paddingX: '0.7rem', paddingY: '0.4rem', iconOnlyWidth: '2rem' },
        lg: { paddingX: '1.1rem', paddingY: '0.7rem' },
      },
    },

    card: {
      root: {
        borderRadius: '{border.radius.xl}',
        shadow: '0 1px 2px 0 light-dark(rgb(15 23 42 / 0.04), rgb(0 0 0 / 0.25))',
      },
      body: { padding: '1.5rem', gap: '1.25rem' },
    },

    datatable: {
      headerCell: {
        background: 'light-dark({surface.50}, {surface.800})',
        color: 'light-dark({surface.600}, {surface.300})',
        padding: '0.7rem 1rem',
        borderColor: 'light-dark({surface.200}, {surface.800})',
      },
      columnTitle: { fontWeight: '600' },
      bodyCell: {
        padding: '0.8rem 1rem',
        borderColor: 'light-dark({surface.200}, {surface.800})',
      },
      row: {
        hoverBackground: 'light-dark({surface.50}, {surface.800})',
      },
      sortIcon: { color: 'light-dark({surface.400}, {surface.500})' },
    },

    paginator: {
      root: { padding: '0.75rem 1rem', gap: '0.25rem', borderRadius: '0' },
      navButton: { borderRadius: '{border.radius.md}' },
    },

    message: {
      root: { borderRadius: '{border.radius.lg}' },
    },

    toast: {
      root: { borderRadius: '{border.radius.xl}' },
    },

    tooltip: {
      root: { borderRadius: '{border.radius.md}' },
    },
  },
});
