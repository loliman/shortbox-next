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

interface AutocompleteBaseProps {
  id?: string;
  options: OptionValue[];
  value: OptionValue | OptionValue[] | string | null;
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
  getOptionLabel: (option: OptionValue | string) => string;
  getOptionKey?: (option: OptionValue | string) => string | number;
  isOptionEqualToValue: (option: OptionValue, value: OptionValue | string) => boolean;
  onInputChange?: (
    event: React.SyntheticEvent,
    value: string,
    reason: AutocompleteInputChangeReason
  ) => void;
  onChange?: (
    event: React.SyntheticEvent,
    value: OptionValue | OptionValue[] | string | null,
    reason: AutocompleteChangeReason,
    details?: AutocompleteChangeDetails<OptionValue>
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
  const autocompleteId = React.useMemo(
    () => id || buildAutocompleteId({ inputAriaLabel, label, placeholder }),
    [id, inputAriaLabel, label, placeholder]
  );
  const mergedTextFieldSx: SxProps<Theme> = React.useMemo(
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
      ];
    },
    [textFieldSx]
  );

  return (
    <Autocomplete<OptionValue, boolean, false, boolean>
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
      isOptionEqualToValue={(option, selected) =>
        isOptionEqualToValue(option as OptionValue, selected as OptionValue | string)
      }
      getOptionLabel={(option) => getOptionLabel(option as OptionValue | string)}
      getOptionKey={(option) =>
        (getOptionKey ? getOptionKey(option as OptionValue | string) : getOptionLabel(option as OptionValue | string))
      }
      noOptionsText={noOptionsText}
      loadingText={loadingText}
      onInputChange={onInputChange}
      onChange={(event, selected, reason, details) =>
        onChange?.(
          event,
          selected as OptionValue | OptionValue[] | string | null,
          reason,
          details as AutocompleteChangeDetails<OptionValue>
        )
      }
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
          inputProps={{
            ...params.inputProps,
            "aria-label": inputAriaLabel,
          }}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
    />
  );
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
