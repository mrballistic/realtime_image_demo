# MUI Grid v7 API Reference

## Key Changes from Previous Versions

### 1. No More `item` Prop
- Grid components are **always items by default**
- Only use `container` prop when you need a flex container
- Remove all `item` props from Grid components

### 2. New `size` Prop
- Replace breakpoint props (`xs`, `sm`, `md`, `lg`, `xl`) with the `size` prop
- Use object notation for responsive sizes

### Migration Examples

#### Old API (v5 and earlier):
```tsx
<Grid container spacing={2}>
  <Grid item xs={12} md={6}>
    <Item>Content</Item>
  </Grid>
  <Grid item xs={12} md={6}>
    <Item>Content</Item>
  </Grid>
</Grid>
```

#### New API (v7):
```tsx
<Grid container spacing={2}>
  <Grid size={{ xs: 12, md: 6 }}>
    <Item>Content</Item>
  </Grid>
  <Grid size={{ xs: 12, md: 6 }}>
    <Item>Content</Item>
  </Grid>
</Grid>
```

#### Single Breakpoint:
```tsx
// Old
<Grid item xs={12}>

// New
<Grid size={12}>
```

## Common Patterns

### Basic Layout
```tsx
<Grid container spacing={2}>
  <Grid size={8}>
    <Item>size=8</Item>
  </Grid>
  <Grid size={4}>
    <Item>size=4</Item>
  </Grid>
</Grid>
```

### Responsive Layout
```tsx
<Grid container spacing={2}>
  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
    <Item>Responsive</Item>
  </Grid>
</Grid>
```

### Auto Width
```tsx
<Grid container spacing={3}>
  <Grid size="auto">
    <Item>size=auto</Item>
  </Grid>
  <Grid size="grow">
    <Item>size=grow</Item>
  </Grid>
</Grid>
```

### Nested Grids
```tsx
<Grid container spacing={2}>
  <Grid size={12}>
    <Grid container spacing={1}>
      <Grid size={6}>
        <Item>Nested</Item>
      </Grid>
    </Grid>
  </Grid>
</Grid>
```

### With Offset
```tsx
<Grid container spacing={3}>
  <Grid size={{ xs: 6, md: 2 }} offset={{ xs: 3, md: 0 }}>
    <Item>Offset</Item>
  </Grid>
</Grid>
```

## Important Notes

1. **Container is only for containers**: Don't use `container` on items, only on actual grid containers
2. **Size is optional**: If no size is specified, items will auto-layout
3. **Spacing works on containers**: The `spacing` prop goes on the container, not items
4. **Columns default to 12**: Use `columns` prop to change (e.g., `columns={16}`)
5. **Direction limitations**: Don't use `direction="column"` - use Stack component instead for vertical layouts

## TypeScript

No special type changes needed - the `size` prop accepts:
- Numbers: `size={6}`
- Strings: `size="auto"` or `size="grow"`
- Objects: `size={{ xs: 12, md: 6 }}`

## Common Errors to Fix

❌ **Wrong**:
```tsx
<Grid item xs={12} md={6}>
```

✅ **Correct**:
```tsx
<Grid size={{ xs: 12, md: 6 }}>
```

❌ **Wrong**:
```tsx
<Grid container item xs={12}>
```

✅ **Correct**:
```tsx
<Grid container>
  <Grid size={12}>
```
