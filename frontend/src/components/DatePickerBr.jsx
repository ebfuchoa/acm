import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import 'dayjs/locale/pt-br'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'

dayjs.extend(customParseFormat)

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function parseBr(value) {
  if (!value) return null
  const parsed = dayjs(value, 'DD/MM/YYYY', true)
  return parsed.isValid() ? parsed : null
}

export function DatePickerBr({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  disableFuture = false,
}) {
  return (
    <>
      <label>{label}</label>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
        <DatePicker
          format="DD/MM/YYYY"
          value={parseBr(value)}
          onChange={(next) => {
            if (!next || !next.isValid()) {
              onChange('')
              return
            }
            onChange(next.format('DD/MM/YYYY'))
          }}
          disabled={disabled}
          disableFuture={disableFuture}
          dayOfWeekFormatter={(date) => WEEKDAY_INITIALS[date.day()]}
          slotProps={{
            textField: {
              className: 'date-picker-br',
              required,
              fullWidth: true,
              size: 'small',
            },
          }}
        />
      </LocalizationProvider>
    </>
  )
}
