import React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import type {
  AutocompleteChangeDetails,
  AutocompleteChangeReason,
  AutocompleteInputChangeReason,
} from "@mui/material/Autocomplete";
import type { SxProps, Theme } from "@mui/material/styles";

type OptionValue = Record<string, unknown>;
type AutocompleteOption = OptionValue | string;
type AutocompleteBaseValue = AutocompleteOption | AutocompleteOption[] | null;

interface AutocompleteBaseProps {
  id?: string;
  options: OptionValue[];
  value: AutocompleteBaseValue;
  inputValue?: string;
  label?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  freeSolo?: boolean;
  loading?: boolean;
  noOptionsText?: React.ReactNode;
  loadingText?: React.ReactNode;
  variant?: "filled" | "outlined" | "standard";
  textFieldSx?: SxProps<Theme>;
  inputAriaLabel?: string;
  popupIcon?: React.ReactNode;
  error?: boolean;
  helperText?: React.ReactNode;
  onFocus?: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLElement>) => void;
  onListboxScroll?: (e: React.UIEvent<HTMLElement>) => void;
  getOptionLabel: (option: AutocompleteOption) => string;
  getOptionKey?: (option: AutocompleteOption) => string | number;
  isOptionEqualToValue: (option: OptionValue, value: AutocompleteOption) => boolean;
  onInputChange?: (
    event: React.SyntheticEvent,
    value: string,
    reason: AutocompleteInputChangeReason
  ) => void;
  onChange?: (
    event: React.SyntheticEvent,
    value: AutocompleteBaseValue,
    reason: AutocompleteChangeReason,
    details?: AutocompleteChangeDetails<AutocompleteOption>
  ) => void;
}

function AutocompleteBase({
  id,
  options,
  value,
  inputValue,
  label,
  placeholder,
  disabled,
  multiple,
  freeSolo,
  loading,
  noOptionsText,
  loadingText,
  variant = "outlined",
  textFieldSx,
  inputAriaLabel,
  popupIcon,
  error,
  helperText,
  onFocus,
  onBlur,
  onListboxScroll,
  getOptionLabel,
  getOptionKey,
  isOptionEqualToValue,
  onInputChange,
  onChange,
}: Readonly<AutocompleteBaseProps>) {
  const readOptionLabel = React.useCallback(
    (option: AutocompleteOption) => getOptionLabel(option),
    [getOptionLabel]
  );
  const readOptionKey = React.useCallback(
    (option: AutocompleteOption) => (getOptionKey ? getOptionKey(option) : readOptionLabel(option)),
    [getOptionKey, readOptionLabel]
  );
  const compareOption = React.useCallback(
    (option: AutocompleteOption, selected: AutocompleteOption) =>
      isOptionRecord(option) && isOptionEqualToValue(option, selected),
    [isOptionEqualToValue]
  );

  const autocompleteId = React.useMemo(
    () => id || buildAutocompleteId({ inputAriaLabel, label, placeholder }),
    [id, inputAriaLabel, label, placeholder]
  );
  const mergedTextFieldSx = React.useMemo<SxProps<Theme>>(
    () => {
      let sxList: SxProps<Theme>[] = [];
      if (Array.isArray(textFieldSx)) {
        sxList = textFieldSx;
      } else if (textFieldSx) {
        sxList = [textFieldSx];
      }
      return [
        {
          "& .MuiOutlinedInput-root": {
            bgcolor: "background.paper",
          },
        },
        ...sxList,
      ] as SxProps<Theme>;
    },
    [textFieldSx]
  );

  return (
    <Autocomplete<AutocompleteOption, boolean, false, boolean>
      id={autocompleteId}
      multiple={Boolean(multiple)}
      freeSolo={Boolean(freeSolo)}
      clearOnBlur={false}
      disableClearable={false}
      filterSelectedOptions={false}
      filterOptions={(x) => x}
      disabled={disabled}
      loading={loading}
      options={options}
      value={value}
      inputValue={inputValue}
      popupIcon={popupIcon ?? undefined}
      slotProps={{
        listbox: {
          onScroll: onListboxScroll,
          sx: { maxHeight: 320, overflow: "auto" },
        },
      }}
      isOptionEqualToValue={compareOption}
      getOptionLabel={readOptionLabel}
      getOptionKey={readOptionKey}
      noOptionsText={noOptionsText}
      loadingText={loadingText}
      onInputChange={onInputChange}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      renderInput={(params) => (
        <TextField
          {...params}
          variant={variant}
          sx={mergedTextFieldSx}
          error={error}
          helperText={helperText}
          label={label}
          placeholder={placeholder ? placeholder.trim() : "Suchen..."}
          slotProps={{
            htmlInput: {
              ...params.inputProps,
              "aria-label": inputAriaLabel,
            },
            inputLabel: { shrink: true },
            input: {
              ...params.InputProps,
              endAdornment: (
                <React.Fragment>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            },
          }}
        />
      )}
    />
  );
}

function isOptionRecord(option: AutocompleteOption): option is OptionValue {
  return typeof option === "object" && option !== null;
}

function buildAutocompleteId(input: {
  inputAriaLabel?: string;
  label?: React.ReactNode;
  placeholder?: string;
}) {
  const preferredText =
    input.inputAriaLabel ||
    (typeof input.label === "string" ? input.label : "") ||
    input.placeholder ||
    "autocomplete";

  return `autocomplete-${preferredText
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")}`;
}

export default AutocompleteBase;
