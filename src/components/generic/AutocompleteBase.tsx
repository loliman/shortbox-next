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
  onFocus?: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLElement>) => void;
  onListboxScroll?: (e: React.UIEvent<HTMLElement>) => void;
  getOptionLabel: (option: OptionValue | string) => string;
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
  onFocus,
  onBlur,
  onListboxScroll,
  getOptionLabel,
  isOptionEqualToValue,
  onInputChange,
  onChange,
}: Readonly<AutocompleteBaseProps>) {
  const mergedTextFieldSx: SxProps<Theme> = React.useMemo(
    () => [
      {
        "& .MuiOutlinedInput-root": {
          bgcolor: "background.paper",
        },
      },
      ...(Array.isArray(textFieldSx) ? textFieldSx : textFieldSx ? [textFieldSx] : []),
    ],
    [textFieldSx]
  );

  return (
    <Autocomplete<OptionValue, boolean, false, boolean>
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
      popupIcon={popupIcon || undefined}
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

export default AutocompleteBase;
