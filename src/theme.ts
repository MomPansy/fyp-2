import {
    Drawer,
    MantineThemeOverride,
    Modal,
    createTheme,
    virtualColor,
  } from '@mantine/core';
  
  export const theme: MantineThemeOverride = createTheme({
    fontFamily: 'Quicksand',
    cursorType: 'pointer',
    primaryColor: 'hf-blue',
    breakpoints: {
      xs: '30em',
      sm: '48em',
      md: '64em',
      lg: '74em',
      xl: '90em',
    },
    fontSizes: {
      xs: '0.7rem',
      sm: '0.9rem',
      md: '1.1rem',
      lg: '1.3rem',
      xl: '1.5rem',
    },
    components: {
      Modal: Modal.extend({
        defaultProps: {
          styles: {
            title: {
              fontWeight: 500, // medium
            },
          },
        },
      }),
      Drawer: Drawer.extend({
        defaultProps: {
          styles: {
            title: {
              fontWeight: 500, // medium
            },
          },
        },
      }),
    },
    colors: {
      'hf-blue': virtualColor({
        name: 'hf-blue',
        dark: 'indigo',
        // dark: 'hf-blue-dark',
        light: 'hf-blue-light',
      }),
      'hf-blue-light': [
        '#edf2ff',
        '#dbe2f5',
        '#b6c1e5',
        '#8e9fd5',
        '#6c82c8',
        '#5670c0',
        '#4b66bd',
        '#3b56a7',
        '#334c97',
        '#274186',
      ],
      'hf-blue-dark': [
        // '#FFFFFF',
        '#FFFFFF',
        '#edf2ff',
        '#dbe2f5',
        '#b6c1e5',
        '#8e9fd5',
        '#6c82c8',
        '#5670c0',
        '#4b66bd',
        '#3b56a7',
        '#334c97',
        '#274186',
      ],
      'hf-orange': [
        '#fbdfbf',
        '#fad7b0',
        '#f8cfa0',
        '#f7c790',
        '#f6bf80',
        '#f5b770',
        '#f4af60',
        '#dc9e56',
        '#c38c4d',
        '#ab7a43',
      ],
      'hf-grey': [
        '#f9fafb',
        '#f8f9fa',
        '#f7f8f9',
        '#f5f7f8',
        '#f4f5f7',
        '#f2f4f6',
        '#f1f3f5',
        '#d9dbdd',
        '#c1c2c4',
        '#a9aaac',
      ],
    },
  });
  