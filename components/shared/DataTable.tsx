'use client'

import {
  DataGrid,
  DataGridProps,
  GridColDef,
  GridPaginationModel,
} from '@mui/x-data-grid'
import { Box, InputAdornment, TextField } from '@mui/material'
import { Search } from '@mui/icons-material'

interface DataTableProps
  extends Omit<
    DataGridProps,
    'paginationModel' | 'onPaginationModelChange' | 'paginationMode'
  > {
  rows: DataGridProps['rows']
  columns: GridColDef[]
  loading?: boolean
  paginationModel: GridPaginationModel
  onPaginationModelChange: (model: GridPaginationModel) => void
  rowCount: number
  /** Optional controlled search field rendered above the grid */
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
}

export function DataTable({
  rows,
  columns,
  loading = false,
  paginationModel,
  onPaginationModelChange,
  rowCount,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  ...rest
}: DataTableProps) {
  const hasSearch = onSearchChange !== undefined

  return (
    <Box className="flex flex-col gap-3">
      {hasSearch && (
        <TextField
          value={searchValue ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          size="small"
          sx={{ width: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      )}

      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        rowCount={rowCount}
        paginationMode="server"
        pageSizeOptions={[10, 20, 50]}
        disableRowSelectionOnClick
        autoHeight
        sx={{
          border: 'none',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: 'grey.50',
            borderBottom: '1px solid',
            borderColor: 'divider',
          },
          '& .MuiDataGrid-cell': {
            borderColor: 'divider',
          },
          '& .MuiDataGrid-row:hover': {
            cursor: 'pointer',
            backgroundColor: 'action.hover',
          },
        }}
        {...rest}
      />
    </Box>
  )
}
