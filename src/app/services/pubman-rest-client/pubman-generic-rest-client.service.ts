import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DISPLAY_ERROR } from '../interceptors/http-context-tokens';

export interface SearchResult<Type> {
  numberOfRecords: number,
  records: {
    data: Type,
    persistenceId: string
  }[]
}

export interface TaskParamVO {
  comment?: string,
  lastModificationDate: Date
}

export interface HttpOptions {

  globalErrorDisplay?: boolean;
  withCredentials?: boolean;
  headers?: HttpHeaders,
  params?: HttpParams,
  responseType?: "arraybuffer" | "blob" | "text" | "json" | undefined,
  observe?:"body" | "events" | "response" | undefined,
  reportProgress?: boolean;

}

export abstract class PubmanGenericRestClientService<modelType> {

  // restUri = 'https://gui.inge.mpdl.mpg.de/rest';
  // restUri = 'https://qa.pure.mpdl.mpg.de/rest';
  protected restUri = environment.inge_rest_uri;
  protected httpClient: HttpClient = inject(HttpClient);
  protected subPath:string;

  protected constructor(subPath: string) {
    this.subPath = subPath;
  }

  create(obj: modelType, opts?: HttpOptions) : Observable<modelType> {
    console.log('Creating: ', typeof obj);
    return this.httpPostJson(this.subPath, obj, opts);
  }

  retrieve(id: string, opts?: HttpOptions): Observable<modelType> {
    return this.httpGet(this.subPath + '/' + id, opts);
  }

  update(id: string, obj: modelType, opts?: HttpOptions): Observable<modelType> {
    console.log('Updating:', id, typeof id)
    return this.httpPut(this.subPath + '/' + id, obj, opts);
  }

  delete(id: string, lastModificationDate: Date|undefined, opts?: HttpOptions): Observable<number> {
    let taskParam = null;
    if (lastModificationDate) {
        const isoDate = new Date(lastModificationDate).toISOString();
        taskParam = {
          'lastModificationDate': isoDate
    }
  }
    return this.httpDelete(this.subPath + '/' + id, taskParam, opts);
  }


  private getHttpClientOptions(body?:any, opts?:HttpOptions) {
    const headers = opts?.headers;
    const params = opts?.params;
    const responseType = opts?.responseType ? opts.responseType : 'json';
    const observe = opts?.observe ? opts.observe : 'body';
    const withCredentials = opts?.withCredentials ? opts.withCredentials : true;
    const context = this.addContext(opts);
    const reportProgress = opts?.reportProgress ? opts?.reportProgress : false;

    const options = {
      body,
      headers,
      params: params,
      responseType: responseType,
      observe: observe,
      withCredentials: withCredentials,
      context: context,
      reportProgress: reportProgress,

    }
    return options;
  }

  protected createOrMergeHttpOptions(httpOptionsGiven?: HttpOptions, httpOptionsToMerge?: HttpOptions): HttpOptions {
    const mergedHttpOptions = httpOptionsGiven ? httpOptionsGiven : {};
    Object.assign(mergedHttpOptions, httpOptionsToMerge);
    return mergedHttpOptions;

  }

  protected httpRequest(method: string, path: string, body?: any, opts?: HttpOptions): Observable<any> {
    const requestUrl = this.restUri + path;
    return this.httpClient.request(method, requestUrl, this.getHttpClientOptions(body, opts));
  }

  private getHttpStatus(method: string, path: string, body: Date | undefined, opts?: HttpOptions): Observable<number> {
    const requestUrl = this.restUri + path;
    const mergedHttpOptions = this.createOrMergeHttpOptions(opts, {observe: "response", responseType: "text"})
    return this.httpClient.request(method, requestUrl, this.getHttpClientOptions(body, mergedHttpOptions)).pipe(
      map((response) => {
        const status = response.status;
        return status;
      })
    );
  }

  protected addContentTypeHeader(opts: HttpOptions | undefined): HttpOptions {

    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json');
    return this.createOrMergeHttpOptions(opts, {headers: headers});
  }


  protected addContext(opts?: HttpOptions) : HttpContext {
    const context = new HttpContext();
    if(opts && opts.globalErrorDisplay!==undefined) {
      context.set(DISPLAY_ERROR, opts.globalErrorDisplay);
    }
    return context;
  }



  protected httpGet(path: string,opts?: HttpOptions ): Observable<any> {
      return this.httpRequest('GET', path, undefined, opts);

  }

  protected httpHead(path: string, opts?: HttpOptions): Observable<any> {
    const mergedOpts = this.createOrMergeHttpOptions(opts, {observe: 'response'});
    return this.httpRequest('HEAD', path, undefined, mergedOpts);
  }

  protected httpPostJson(path: string, resource: any, opts?: HttpOptions): Observable<any> {
    const body = JSON.stringify(resource);
    const mergedOpts = this.addContentTypeHeader(opts);
    return this.httpRequest('POST', path, body, mergedOpts);
  }

  protected httpPostAny(path: string, resource: any, opts?: HttpOptions): Observable<any> {
    //const mergedOpts = this.addContentTypeHeader(opts);
    return this.httpRequest('POST', path, resource, opts);
  }

  protected httpPut(path: string, resource: any, opts?: HttpOptions): Observable<any> {
    const body = JSON.stringify(resource);
    const mergedOpts = this.addContentTypeHeader(opts);
    return this.httpRequest('PUT', path, body, mergedOpts);
  }

  protected httpPutText(path: string, bodyText: string, opts?: HttpOptions): Observable<any> {
    const mergedOpts = this.addContentTypeHeader(opts);
    return this.httpRequest('PUT', path, bodyText, mergedOpts);
  }

  protected httpDelete(path: string, body: any, opts?: HttpOptions): Observable<number> {
    return this.getHttpStatus('DELETE', path, body, opts);
  }

}
