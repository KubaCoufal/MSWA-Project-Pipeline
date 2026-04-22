import { Autocomplete, Box, Stack, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { api } from '../../api/client'
import type { KaggleDatasetResult } from '../../api/types'

interface KaggleDatasetFieldProps {
  value: string
  onChange: (value: string) => void
}

function extractKaggleSlug(text: string): string | null {
  const match = text.match(/kaggle\.com\/datasets\/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`
  return `${bytes} B`
}

export function KaggleDatasetField({ value, onChange }: KaggleDatasetFieldProps) {
  const [inputText, setInputText] = useState(value)
  const [searchQuery, setSearchQuery] = useState('')

  // Keep input in sync when the parent resets the form
  useEffect(() => {
    setInputText(value)
  }, [value])

  // Debounce: trigger search 400 ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      // Don't search if the field already holds a valid slug (contains exactly one '/')
      const parts = inputText.trim().split('/')
      if (parts.length === 2 && parts[0] && parts[1]) return
      setSearchQuery(inputText.trim())
    }, 400)
    return () => clearTimeout(timer)
  }, [inputText])

  const { data: options = [], isFetching } = useQuery({
    queryKey: ['kaggle-datasets', searchQuery],
    queryFn: () => api.searchKaggleDatasets(searchQuery),
    enabled: searchQuery.length >= 3,
    staleTime: 60_000,
  })

  function handleInputChange(_: React.SyntheticEvent, newText: string) {
    // URL paste: extract slug immediately, no debounce needed
    const slug = extractKaggleSlug(newText)
    if (slug) {
      setInputText(slug)
      onChange(slug)
      return
    }
    setInputText(newText)
    onChange(newText)
  }

  function handleOptionSelect(_: React.SyntheticEvent, option: KaggleDatasetResult | string | null) {
    if (!option) return
    const slug = typeof option === 'string' ? option : option.ref
    setInputText(slug)
    onChange(slug)
  }

  return (
    <Autocomplete<KaggleDatasetResult, false, false, true>
      freeSolo
      options={options}
      filterOptions={(x) => x}
      getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.ref)}
      isOptionEqualToValue={(opt, val) =>
        typeof val === 'string' ? opt.ref === val : opt.ref === val.ref
      }
      inputValue={inputText}
      onInputChange={handleInputChange}
      onChange={handleOptionSelect}
      loading={isFetching}
      noOptionsText={
        searchQuery.length < 3 ? 'Type at least 3 characters to search' : 'No datasets found'
      }
      renderOption={(props, option) => {
        const { key, ...rest } = props as typeof props & { key: React.Key }
        return (
          <Box component="li" key={key} {...rest}>
            <Stack spacing={0}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {option.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {option.ref}
                {option.totalBytes > 0 && ` · ${formatBytes(option.totalBytes)}`}
                {option.downloadCount > 0 &&
                  ` · ${option.downloadCount.toLocaleString()} downloads`}
              </Typography>
            </Stack>
          </Box>
        )
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Kaggle dataset"
          helperText="Search by name, or paste a Kaggle dataset URL"
        />
      )}
    />
  )
}
