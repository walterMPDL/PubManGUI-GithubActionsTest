import { computed, Injectable, OnDestroy, signal} from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

import type * as params from '../interfaces/batch-params';
import * as resp from '../interfaces/batch-responses';

import { ignoredStatuses} from 'src/app/services/interceptors/http-error.interceptor';
import { AaService } from 'src/app/services/aa.service';
import { ItemsService } from "src/app/services/pubman-rest-client/items.service";
import { ItemVersionVO } from 'src/app/model/inge';
import { MessageService } from 'src/app/services/message.service';

import { _, TranslateService } from '@ngx-translate/core';
import {AddRemoveFromListGenericService} from "../../../services/add-remove-from-list-generic.service";

@Injectable({
  providedIn: 'root'
})
export class BatchService extends AddRemoveFromListGenericService implements OnDestroy{

  readonly #baseUrl: string = environment.inge_rest_uri;

  updateDelay = 1;

  constructor(
    private http: HttpClient,
    public aaSvc: AaService,
    private itemSvc: ItemsService,
    private msgSvc: MessageService,
    private translateSvc: TranslateService) {
      super("batch-items", aaSvc);
    }

  ngOnDestroy(): void {
    super.destroy();
  }

  lastPageNumFrom = signal({logs: 1, details: 1});

  #hasLogs = signal(false);
  public hasLogs = computed(() => this.#hasLogs());


  #logFilters = signal<resp.BatchProcessLogDetailState[]>([]);
  public getLogFilters = computed( () => this.#logFilters() );

  public setLogFilters(filters: resp.BatchProcessLogDetailState[]) {
      this.#logFilters.set(filters);
  }

  public getItemsCount() {
    return this.objectIds$.value.length;
  }

  get items(): string[] {
    return this.objectIds$.value
  }

  public areItemsSelected() {
    return this.objectIds$.value.length > 0;
  }

  startProcess(id: number) {
    this.getBatchProcessUserLock().subscribe(response => {
        this.msgSvc.info(this.translateSvc.instant(_('batch.actions.start')) + '\n');
        this.#processRunning.set(true);
        this.updateProcessProgress(id);
    });
  }

  endProcess() {
    this.batchProcessLogHeaderId = -1;

    this.msgSvc.success(this.translateSvc.instant(_('batch.actions.stop')) + '\n');
    this.#processRunning.set(false);

    const removed = this.removeItems(this.items);
    this.checkLogs();
  }

  #processRunning = signal(false);
  public isProcessRunning = computed( () => this.#processRunning() );

  #processLog = signal({} as resp.BatchProcessLogHeaderDbVO);
  public getProcessLog = computed( () => this.#processLog() );

  updateProcessProgress(id: number) {
    if (this.isProcessRunning()) { 
      this.getBatchProcessLogHeaderId(id).subscribe(response => { 
        this.#processLog.set(response);
        if (response.state === resp.BatchProcessLogHeaderState.RUNNING) {
          setTimeout(() => {
            this.updateProcessProgress(id);
          }, 1000 * (this.updateDelay < 60 ? Math.ceil(this.updateDelay++ / 10) : 60 ));
        } else {
          this.updateDelay = 2;
          this.endProcess();
        }
      })
    }
  }

  set batchProcessLogHeaderId(id: number) {
    sessionStorage.setItem('batchProcessLogHeaderId', id.toString());
  }

  get batchProcessLogHeaderId(): number {
    const batchProcessLogHeaderId = sessionStorage.getItem('batchProcessLogHeaderId');
    if (batchProcessLogHeaderId) {
      return JSON.parse(batchProcessLogHeaderId);
    } else {
      return -1;
    }
  }

  getSelectedItems(): ItemVersionVO[] {
    let datasets: ItemVersionVO[] = [];
    for (var id of this.items) {
        this.itemSvc.retrieve(id)
          .subscribe( actionResponse => {
            datasets.push(actionResponse);
            console.log(id);
          })
    };
    return datasets;
  }

  // Only for Administrators

  getBatchProcessUserLock(): Observable<resp.BatchProcessUserLockDbVO> {
    const url = `${this.#baseUrl}/batchProcess/getBatchProcessUserLock`;

    return this.http.get<resp.BatchProcessUserLockDbVO>(url, { withCredentials:true, context: ignoredStatuses([404]) });
  }

  deleteBatchProcessUserLock(): Observable<any> {
    const url = `${this.#baseUrl}/batchProcess/deleteBatchProcessUserLock/${ this.aaSvc.principal.value.user?.objectId || '' }`;

    return this.http.delete<any>(url, { withCredentials: true });
  }

  // Logs

  checkLogs() {
    this.getAllBatchProcessLogHeaders()
      .subscribe(response => {
        this.#hasLogs.set(response.length > 0 ? true : false);
      });
  }

  getAllBatchProcessLogHeaders(): Observable<resp.BatchProcessLogHeaderDbVO[]> {
    const url = `${this.#baseUrl}/batchProcess/getAllBatchProcessLogHeaders`;

    return this.http.get<resp.BatchProcessLogHeaderDbVO[]>(url, { withCredentials: true, context: ignoredStatuses([404])});
    //return this.http.get<resp.BatchProcessLogHeaderDbVO[]>(url, { withCredentials: true });
  }

  getBatchProcessLogHeaderId(batchLogHeaderId: number): Observable<resp.BatchProcessLogHeaderDbVO> {
    const url = `${this.#baseUrl}/batchProcess/${batchLogHeaderId}`;

    return this.http.get<resp.BatchProcessLogHeaderDbVO>(url, { withCredentials: true });
  }

  getBatchProcessLogDetails(batchProcessLogDetailId: number): Observable<resp.BatchProcessLogDetailDbVO[]> {
    const url = `${this.#baseUrl}/batchProcess/batchProcessLogDetails/${batchProcessLogDetailId}`;
    
    return this.http.get<resp.BatchProcessLogDetailDbVO[]>(url, { withCredentials: true });
  }

  getItem(itemId: string): Observable<ItemVersionVO> {
    const url = `${this.#baseUrl}/items/${itemId}`;

    return this.http.get<ItemVersionVO>(url, { withCredentials: true });
  }

  // Actions

  deletePubItems(actionParams: params.DeletePubItemsParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/deletePubItems`;
    const body = actionParams;

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  submitPubItems(actionParams: params.SubmitPubItemsParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/submitPubItems`;
    const body = actionParams;

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  revisePubItems(actionParams: params.RevisePubItemsParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/revisePubItems`;
    const body = actionParams;

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  releasePubItems(actionParams: params.ReleasePubItemsParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/releasePubItems`;
    const body = actionParams;

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  withdrawPubItems(actionParams: params.WithdrawPubItemsParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/withdrawPubItems`;
    const body = actionParams;

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url, body, { withCredentials:true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  changeContext(actionParams: params.ChangeContextParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/changeContext`;
    const query = `?contextFrom=${actionParams.contextFrom}&contextTo=${actionParams.contextTo}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  addLocalTags(actionParams: params.AddLocalTagsParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/addLocalTags`;
    const body = actionParams;
    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => {
          console.log('Success: \n' + JSON.stringify(value));
        }),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  changeLocalTags(actionParams: params.ChangeLocalTagParams): Observable<resp.ActionGenericResponse> { // TO-DO check function name!
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/changeLocalTag`;
    const query = `?localTagFrom=${actionParams.localTagFrom}&localTagTo=${actionParams.localTagTo}`;
    console.log(url + query);
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  changeGenre(actionParams: params.ChangeGenreParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/changeGenre`;
    var query = `?genreFrom=${actionParams.genreFrom}&genreTo=${actionParams.genreTo}`;
    if (actionParams.degreeType) query += `&degreeType=${actionParams.degreeType}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError((error) => {
          return throwError(() => new Error(JSON.stringify(error) || 'UNKNOWN ERROR!'));
        })
      );

    return actionResponse;
  }

  changeFileVisibility(actionParams: params.ChangeFileVisibilityParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/changeFileVisibility`;
    const query = `?fileVisibilityFrom=${actionParams.fileVisibilityFrom}&fileVisibilityTo=${actionParams.fileVisibilityTo}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  changeFileContentCategory(actionParams: params.ChangeFileContentCategoryParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/changeFileContentCategory`;
    const query = `?fileContentCategoryFrom=${actionParams.fileContentCategoryFrom}&fileContentCategoryTo=${actionParams.fileContentCategoryTo}`;

    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  replaceFileAudience(actionParams: params.ReplaceFileAudienceParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/replaceFileAudience`;
    const body = actionParams;

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  changeExternalReferenceContentCategory(actionParams: params.ChangeExternalReferenceContentCategoryParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/changeExternalReferenceContentCategory`;
    const query = `?externalReferenceContentCategoryFrom=${actionParams.externalReferenceContentCategoryFrom}&externalReferenceContentCategoryTo=${actionParams.externalReferenceContentCategoryTo}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  replaceOrcid(actionParams: params.ReplaceOrcidParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/replaceOrcid`;
    const query = `?creatorId=${actionParams.creatorId}&orcid=${actionParams.orcid}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  changeReviewMethod(actionParams: params.ChangeReviewMethodParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/changeReviewMethod`;
    const query = `?reviewMethodFrom=${actionParams.reviewMethodFrom}&reviewMethodTo=${actionParams.reviewMethodTo}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  addKeywords(actionParams: params.AddKeywordsParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/addKeywords`;
    const query = `?keywords=${actionParams.keywords}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  replaceKeywords(actionParams: params.ReplaceKeywordsParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/replaceKeywords`;
    const query = `?keywords=${actionParams.keywords}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  changeKeywords(actionParams: params.ChangeKeywordsParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/changeKeywords`;
    const query = `?keywordsFrom=${actionParams.keywordsFrom}&keywordsTo=${actionParams.keywordsTo}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  changeSourceGenre(actionParams: params.ChangeSourceGenreParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/changeSourceGenre`;
    const query = `?sourceGenreFrom=${actionParams.sourceGenreFrom}&sourceGenreTo=${actionParams.sourceGenreTo}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  replaceSourceEdition(actionParams: params.ReplaceSourceEditionParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/replaceSourceEdition`;
    const query = `?sourceNumber=${actionParams.sourceNumber}&edition=${actionParams.edition}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  addSourceIdentifer(actionParams: params.AddSourceIdentiferParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const headers = new HttpHeaders();
    headers.set('Access-Control-Allow-Origin', this.#baseUrl);
    const url = `${this.#baseUrl}/batchProcess/addSourceIdentifier`;
    const query = `?sourceNumber=${actionParams.sourceNumber}&sourceIdentifierType=${actionParams.sourceIdentifierType}&sourceIdentifier=${actionParams.sourceIdentifier}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { headers, withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

  changeSourceIdentifier(actionParams: params.ChangeSourceIdentifierParams): Observable<resp.ActionGenericResponse> {
    actionParams.itemIds = this.items;

    const url = `${this.#baseUrl}/batchProcess/changeSourceIdentifier`;
    const query = `?sourceNumber=${actionParams.sourceNumber}&sourceIdentifierType=${actionParams.sourceIdentifierType}&sourceIdentifierFrom=${actionParams.sourceIdentifierFrom}&sourceIdentifierTo=${actionParams.sourceIdentifierTo}`;
    const body = { itemIds: actionParams.itemIds };

    const actionResponse: Observable<resp.ActionGenericResponse> = this.http.put<resp.ActionGenericResponse>(url + query, body, { withCredentials: true })
      .pipe(
        tap((value: resp.ActionGenericResponse) => console.log('Success: \n' + JSON.stringify(value))),
        catchError(err => throwError(() => err)),
      );

    return actionResponse;
  }

}
