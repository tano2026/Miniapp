import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { BookingRuleError } from '../orders/order-rules';

/** Lỗi vi phạm quy tắc đặt chỗ -> 422 kèm thông báo tiếng Việt cho người dùng. */
@Catch(BookingRuleError)
export class BookingRuleExceptionFilter implements ExceptionFilter {
  catch(err: BookingRuleError, host: ArgumentsHost) {
    host.switchToHttp().getResponse<Response>().status(422).json({ statusCode: 422, message: err.message });
  }
}
