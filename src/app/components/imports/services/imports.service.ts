import { computed, Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpContext } from '@angular/common/http';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DISPLAY_ERROR } from 'src/app/services/interceptors/http-context-tokens';

import type * as params from '../interfaces/imports-params';

import {
  ImportErrorLevel,
  ImportLogDbVO,
  ImportLogItemDbVO,
  ImportLogItemDetailDbVO,
  ItemVersionVO,
} from 'src/app/model/inge';

import { AaService } from 'src/app/services/aa.service';

@Injectable({
  providedIn: 'root'
})
export class ImportsService {

  readonly #baseUrl: string = environment.inge_rest_uri;

  http = inject(HttpClient);
  aaSvc = inject(AaService);

  get isDepositor(): boolean {
    return this.aaSvc.principal.value.isDepositor;
  }

  get isModerator(): boolean {
    return this.aaSvc.principal.value.isModerator;
  }

  #hasImports = signal(false);
  public hasImports = computed(() => this.#hasImports());

  #importRunning = signal(false); // Deprecated
  public isImportRunning = computed(() => this.#importRunning()); // Deprecated

  lastPageNumFrom = signal({ myImports: 1, details: 1, log: 1 });

  #lastFetch = signal<Observable<ItemVersionVO>>(of());
  public getLastFetch = computed(() => this.#lastFetch());

  #logFilters = signal<ImportErrorLevel[]>([]);

  public setLogFilters(filters: ImportErrorLevel[]) {
    this.#logFilters.set(filters);
  }

  public getLogFilters = computed(() => this.#logFilters());


  context:HttpContext = new HttpContext().set(DISPLAY_ERROR, false);


  checkImports() {
    this.getImportLogs()
      .subscribe(response => {
        this.#hasImports.set(response.length > 0 ? true : false);
      }
      );
  }

  getCrossref(importParams: params.GetCrossrefParams): Observable<ItemVersionVO> {
    const url = `${this.#baseUrl}/dataFetch/getCrossref`;
    const query = `?identifier=${importParams.identifier}`;

    return this.getDataFetch(url, query );
  }

  getArxiv(importParams: params.GetArxivParams): Observable<ItemVersionVO> {
    const url = `${this.#baseUrl}/dataFetch/getArxiv`;
    const query = `?identifier=${importParams.identifier}&fullText=${importParams.fullText}`;

    return this.getDataFetch(url, query );
  }

  getDataFetch(url: string, query: string): Observable<ItemVersionVO> {
   const importResponse: Observable<ItemVersionVO> = this.http.request<ItemVersionVO>('GET', url + query, { withCredentials: true })
      .pipe(
        tap((value: ItemVersionVO) => {
          this.#lastFetch.set(of(value));
        })
      );

    return importResponse;
  }

  getImportLog(id: number): Observable<ImportLogDbVO> {
    const url = `${this.#baseUrl}/import/importLog/${id}`;

    return this.http.request<ImportLogDbVO>('GET', url, { withCredentials: true, context: this.context });
  }

  getImportLogs(): Observable<ImportLogDbVO[]> {
    const url = `${this.#baseUrl}/import/getImportLogs`;

    return this.http.request<ImportLogDbVO[]>('GET', url, { withCredentials: true, context: this.context });
  }

  getImportLogItems(id: number): Observable<ImportLogItemDbVO[]> {
    const url = `${this.#baseUrl}/import/importLogItems/${id}`;

    return this.http.request<ImportLogItemDbVO[]>('GET', url, { withCredentials: true, context: this.context });
  }

  getImportLogItemDetails(id: number): Observable<ImportLogItemDetailDbVO[]> {
    const url = `${this.#baseUrl}/import/importLogItemDetails/${id}`;

    return this.http.request<ImportLogItemDetailDbVO[]>('GET', url, { withCredentials: true, context: this.context });
  }

  deleteImportLog(id: number): Observable<any> {
    const url = `${this.#baseUrl}/import/importLog/${id}`;

    return this.http.request<any>('DELETE', url, { withCredentials: true });
  }

  getFormatConfiguration(format: string): Observable<any> {
    const url = `${this.#baseUrl}/import/getFormatConfiguration`;

    const query = `?format=${format}`;

    return this.http.request<any>('GET',url + query, { withCredentials: true, context: this.context });
  }

  postImport(importParams: params.PostImportParams, data: any): Observable<any> {
    const url = `${this.#baseUrl}/import/import`;
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/octet-stream')
      .set('Content-Disposition', 'attachment');
    const query = `?contextId=${importParams.contextId}&importName=${importParams.importName}&format=${importParams.format}` + `${importParams.formatConfig ? '&formatConfiguration='+importParams.formatConfig : ''}`;

    return this.http.request<any>('POST', url + query, {  body: data, headers, withCredentials: true });
  }

  getContexts(ctxId: string): Observable<any> {
    const url = `${this.#baseUrl}/contexts/${ctxId}`;

    return this.http.request<any>('GET',url, { withCredentials: true, context: this.context });
  }

  deleteImportedItems(importLogId: number): Observable<any> {
    const url = `${this.#baseUrl}/import/deleteImportedItems`;
    const query = `?importLogId=${importLogId}`;

    const response: Observable<any> = this.http.request<any>('PUT', url + query, { withCredentials: true  })
      .pipe(
        tap((value: any) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return response;
  }

  submitImportedItems(importLogId: number, submitModus: string): Observable<any> {
    const url = `${this.#baseUrl}/import/submitImportedItems`;
    const query = `?importLogId=${importLogId}&submitModus=${submitModus}`;

    const response: Observable<any> = this.http.request<any>('PUT', url + query, { withCredentials: true })
      .pipe(
        tap((value: any) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return response;
  }

}
