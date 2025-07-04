# Problem Database Components

This directory contains the refactored components for the database setup functionality, previously contained in a single large `problem-database.tsx` file.

## File Structure

### Components

- **`problem-database.tsx`** - Main component that orchestrates the database setup UI
- **`foreign-key-selector.tsx`** - Component for selecting and managing foreign key relationships between tables
- **`table-selector.tsx`** - Reusable component for selecting tables with toggle buttons
- **`problem-database-skeleton.tsx`** - Loading skeleton component

### Logic & State

- **`use-table-selection.ts`** - Custom hook managing table selection state and logic
- **`database-types.ts`** - TypeScript interfaces and types used across components

### Utilities

- **`database/index.ts`** - Barrel export file for easy importing

## Component Responsibilities

### ProblemDatabase

- Main orchestrating component
- Fetches data and manages overall layout
- Coordinates between child components

### ForeignKeySelector

- Manages foreign key mapping state
- Handles column selection with type validation
- Provides add/remove functionality for multiple mappings

### TableSelector

- Reusable component for table selection
- Manages disabled states to prevent selecting same table twice
- Uses ToggleButton for consistent UI

### useTableSelection

- Encapsulates table selection logic
- Prevents selecting the same table for both positions
- Provides clean interface for toggle handlers

## Benefits of Refactoring

1. **Separation of Concerns** - Each component has a single responsibility
2. **Reusability** - TableSelector can be reused for different table selection scenarios
3. **Maintainability** - Smaller files are easier to understand and modify
4. **Testability** - Individual components can be tested in isolation
5. **Type Safety** - Centralized types ensure consistency across components

## Usage

```tsx
import { ProblemDatabase } from "@/components/problems/database";

// Or import specific components
import {
  ForeignKeySelector,
  TableSelector,
  useTableSelection,
} from "@/components/problems/database";
```
