import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

interface GithubStateRequest extends Request {
  githubState?: string;
}

@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<GithubStateRequest>();
    const queryState = request.query.state;
    // Use the state from the request which we will set in the controller
    return {
      state: typeof queryState === 'string' ? queryState : request.githubState,
    };
  }
}
