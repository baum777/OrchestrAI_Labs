import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { PolicyError } from "@governance/policy/policy-engine";

@Catch(PolicyError)
export class PolicyErrorFilter implements ExceptionFilter {
  catch(exception: PolicyError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = HttpStatus.FORBIDDEN;
    const errorResponse = {
      statusCode: status,
      message: exception.message,
      code: exception.code,
      operation: exception.operation,
      advice: exception.advice,
    };

    response.status(status).json(errorResponse);
  }
}

