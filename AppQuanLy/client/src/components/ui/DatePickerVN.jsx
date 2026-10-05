import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { vi } from 'date-fns/locale/vi';
import { format, isValid } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

// Đăng ký locale Tiếng Việt cho thư viện
registerLocale('vi', vi);

export default function DatePickerVN({ 
  value, 
  onChange, 
  type = 'date', // 'date' | 'month' | 'datetime'
  placeholderText,
  className = 'form-control',
  required = false
}) {
  // Parse value string to Date object
  let selectedDate = null;
  if (value) {
    const parsed = new Date(value);
    if (isValid(parsed)) {
      selectedDate = parsed;
    }
  }

  const handleChange = (date) => {
    if (!date) {
      onChange({ target: { value: '' } });
      return;
    }
    let formatted;
    if (type === 'month') {
      formatted = format(date, 'yyyy-MM');
    } else if (type === 'datetime') {
      // Format cho datetime-local compatible: YYYY-MM-DDTHH:mm
      formatted = format(date, "yyyy-MM-dd'T'HH:mm");
    } else {
      formatted = format(date, 'yyyy-MM-dd');
    }
    onChange({ target: { value: formatted } });
  };

  // Placeholder mặc định theo loại
  const defaultPlaceholder = type === 'month' ? 'Chọn tháng' : type === 'datetime' ? 'Chọn ngày giờ' : 'Chọn ngày';

  if (type === 'month') {
    return (
      <DatePicker
        selected={selectedDate}
        onChange={handleChange}
        dateFormat="MM/yyyy"
        showMonthYearPicker
        locale="vi"
        placeholderText={placeholderText || defaultPlaceholder}
        className={className}
        required={required}
      />
    );
  }

  if (type === 'datetime') {
    return (
      <DatePicker
        selected={selectedDate}
        onChange={handleChange}
        dateFormat="dd/MM/yyyy HH:mm"
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={5}
        timeCaption="Giờ"
        locale="vi"
        placeholderText={placeholderText || defaultPlaceholder}
        className={className}
        required={required}
      />
    );
  }

  return (
    <DatePicker
      selected={selectedDate}
      onChange={handleChange}
      dateFormat="dd/MM/yyyy"
      locale="vi"
      placeholderText={placeholderText || defaultPlaceholder}
      className={className}
      required={required}
    />
  );
}
