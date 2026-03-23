import {
  HttpContext,
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpRequest
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { async, finalize, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MessageService } from 'src/app/services/message.service';
import { AaService } from "../aa.service";
import { NgbModal, NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
import { LoginComponent } from "../../components/aa/login/login.component";
import { Router } from "@angular/router";
import { WindowFocusCheckLoginService } from "../window-focus-check-login.service";
import { DISPLAY_ERROR, IGNORED_STATUSES, SILENT_LOGOUT, ignoredStatuses } from './http-context-tokens';

// Re-export for compatibility with existing imports.
export { ignoredStatuses };

export function httpErrorInterceptor(request: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> {
        const ignoredStatuses = request.context.get(IGNORED_STATUSES);
        const silentLogout = request.context.get(SILENT_LOGOUT);
        const displayError = request.context.get(DISPLAY_ERROR);
        const message = inject(MessageService);
        const aaService = inject(AaService)
        const modalService = inject(NgbModal);
        const windowFocusCheckLoginService = inject(WindowFocusCheckLoginService);
        return next(request)
            .pipe(
                catchError((err: HttpErrorResponse) => {

                  //if the token in the cookie is invalid, mainly because it has expired
                  if(err.status === 401 && err.error && err.error.tokenInvalid) {
                    //The backend will have cleared the cookie here
                    //SILENT_LOGOUT is set to true only on app initialization by the who-method of the aa service, when the app is reloaded. Just repeat the request here and let the individual site handle possible request errors.

                    //Only triggered on new app initialization
                    if(silentLogout) {
                      message.info("Token expired/invalid -- Silent Logout!")
                      return next(request);
                    }
                    //Otherwise, the app is already loaded and some user is working here. Open a dialog to login again
                    else {
                      //Pause change login check
                      windowFocusCheckLoginService.enabled = false;
                      const loginCompRef: NgbModalRef = modalService.open(LoginComponent, {backdrop: 'static'});
                      loginCompRef.componentInstance.forcedLogout = true;

                      return loginCompRef.dismissed.pipe(
                        switchMap((val:string, index) => {
                          console.log("DISMISS REASON" + val)
                          if(val==="login_success") {
                          }
                          else {

                            aaService.logout();
                          }
                          return next(request);
                        }),
                        finalize(() => {
                          windowFocusCheckLoginService.enabled = true;
                        })
                      )

                    }

                  }
                  else {

                    const pubmanErrorResp = new PubManHttpErrorResponse(err);
                    if (displayError && !ignoredStatuses?.includes(err.status)) {
                      //const error = `${err.status} ${err.statusText}:\n${err.url}\n${pubmanErrorResp.userMessage}`
                      message.httpError(pubmanErrorResp);
                    }
                    //throw PubmanErrorResponse to handle in further catchErrors
                    return throwError(() => pubmanErrorResp);
                  }
                })
            );
    }


// https://github.com/angular/angular/issues/19888
// When request of type Blob, the error is also in Blob instead of object of the json data
export function httpBlobErrorInterceptor(req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> {
  return next(req).pipe(
    catchError(err => {
      if (err instanceof HttpErrorResponse && err.error instanceof Blob && err.error.type === "application/json") {

        return new Promise<any>((resolve, reject) => {
          let reader = new FileReader();
          reader.onload = (e: Event) => {
            try {
              const errmsg = JSON.parse((<any>e.target).result);
              reject(new HttpErrorResponse({
                error: errmsg,
                headers: err.headers,
                status: err.status,
                statusText: err.statusText,
                url: err.url || undefined
              }));
            } catch (e) {
              reject(err);
            }
          };
          reader.onerror = (e) => {
            reject(err);
          };
          reader.readAsText(err.error);
        });
      }
      throw err;
    })
  );
}


export class PubManHttpErrorResponse extends HttpErrorResponse {

  userMessage!: string;
  jsonMessage: any = undefined;

  constructor(errorResponse: HttpErrorResponse) {
    super({
      error: errorResponse.error,
      headers: errorResponse.headers,
      status: errorResponse.status,
      statusText: errorResponse.statusText,
      url: errorResponse.url!
    })

    if (this.error) {
      //errors from PubMan backend are JSON objects. However, when requesting "text" or "blob" in Angular HTTP client, the error is a string or blob encoded JSON
      //see https://github.com/angular/angular/issues/19148

      if (typeof this.error === 'object') {
        this.handleJsonError(this.error);
      }
      else if (typeof this.error === 'string') {
        this.handleStringError(this.error);
      }
      else {
        this.userMessage = this.message || 'UNKNOWN ERROR';
      }
    } else {
      this.userMessage = this.message || 'UNKNOWN ERROR';
    }

  }

  handleStringError(stringBody: string) {
    try {
      const json = JSON.parse(stringBody);
      //check if it's a PubMan backend error response, by checking if it has some properties
      this.handleJsonError(json);

    } catch (e) {
      this.userMessage = stringBody;
    }
  }

  private handleJsonError(jsonObj: any) {
    this.jsonMessage = jsonObj
    this.userMessage = jsonObj.message || jsonObj.error || 'UNKNOWN ERROR'

    /*
    errorObj?.['validation-report']?.items?.forEach((item: any) => {

      this.userMessage = this.userMessage + '\n' + item.content;
    });
    console.log(this.userMessage);

     */
  }



}
