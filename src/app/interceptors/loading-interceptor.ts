// src/app/interceptors/loading-interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private totalRequests = 0;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.totalRequests++;

    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    return next.handle(req).pipe(
      finalize(() => {
        this.totalRequests--;
        const duration = Date.now() - startTime;



        if (this.totalRequests === 0) {

        }
      })
    );
  }
}
