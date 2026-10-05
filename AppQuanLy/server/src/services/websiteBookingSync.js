const updateWebsiteBookingStatus = async (booking, requestedStatus) => {
  if (!booking.websiteSource.bookingCode || !booking.websiteSource.bookingStatus || !booking.websiteSource.paymentStatus) {
    const error = new Error('Cần đồng bộ lại đơn website từ CMS trước khi duyệt trên CRM.');
    error.status = 409;
    throw error;
  }
  if (!process.env.CMS_API_URL || !process.env.CMS_CALLBACK_KEY) {
    const error = new Error('Chưa cấu hình CMS_API_URL/CMS_CALLBACK_KEY để duyệt đơn website');
    error.status = 503;
    throw error;
  }
  if (requestedStatus === 'completed') {
    const error = new Error('CMS chưa hỗ trợ trạng thái hoàn tất. Không thể tự đổi đơn website sang trạng thái này.');
    error.status = 400;
    throw error;
  }
  const bookingStatus = requestedStatus === 'paid' ? 'confirmed' : requestedStatus;
  const paymentStatus = requestedStatus === 'paid' ? 'paid' : booking.websiteSource.paymentStatus;
  const url = new URL('/api/bookings/integrations/crm/status', process.env.CMS_API_URL);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CMS_CALLBACK_KEY}`
      },
      body: JSON.stringify({
        booking_id: booking.websiteSource.bookingId,
        booking_code: booking.websiteSource.bookingCode,
        crm_booking_id: String(booking._id),
        status: bookingStatus,
        payment_status: paymentStatus,
        expected_status: booking.websiteSource.bookingStatus,
        expected_payment_status: booking.websiteSource.paymentStatus
      }),
      signal: AbortSignal.timeout(15000)
    });
  } catch (cause) {
    const error = new Error('Không kết nối được CMS. Chưa cập nhật trạng thái đơn; vui lòng thử lại.');
    error.status = 502;
    throw error;
  }
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(typeof result.detail === 'string' ? result.detail : 'CMS từ chối cập nhật trạng thái đơn.');
    error.status = response.status;
    throw error;
  }
  booking.status = result.status === 'cancelled' ? 'cancelled' : result.payment_status === 'paid' ? 'paid' : result.status;
  booking.websiteSource.bookingStatus = result.status;
  booking.websiteSource.paymentStatus = result.payment_status;
  booking.websiteSource.lastSyncedAt = new Date();
  await booking.save();
  return booking;
};

module.exports = { updateWebsiteBookingStatus };
