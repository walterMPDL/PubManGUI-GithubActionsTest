import { Component, Input, SimpleChanges } from '@angular/core';
import { citationTypes, exportTypes } from "../../../model/inge";
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { ItemsService } from "../../../services/pubman-rest-client/items.service";
import { environment } from 'src/environments/environment';
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { ItemSelectionService } from "../../../services/item-selection.service";
import { catchError, EMPTY, Subscription, tap } from "rxjs";
import { LoadingComponent } from "../loading/loading.component";
import { contentDispositionParser } from "../../../utils/utils";
import { TranslatePipe } from "@ngx-translate/core";
import { JsonPipe } from "@angular/common";
import { PubManHttpErrorResponse } from "../../../services/interceptors/http-error.interceptor";
import { ConeAutosuggestComponent } from "../cone-autosuggest/cone-autosuggest.component";
import { NotificationComponent } from "../notification/notification.component";
import { Message, MessageService } from "../../../services/message.service";
import { BootstrapValidationDirective } from "../../../directives/bootstrap-validation.directive";
import { ValidationErrorComponent } from "../validation-error/validation-error.component";
import { MatomoTracker } from "ngx-matomo-client";
import { SanitizeHtmlCitationPipe } from "../../../pipes/sanitize-html-citation.pipe";


@Component({
  selector: 'pure-export-items',
  standalone: true,
  imports: [
    FormsModule,
    LoadingComponent,
    TranslatePipe,
    JsonPipe,
    ConeAutosuggestComponent,
    ReactiveFormsModule,
    NotificationComponent,
    BootstrapValidationDirective,
    ValidationErrorComponent,
    SanitizeHtmlCitationPipe
  ],
  templateUrl: './export-items.component.html',
  styleUrl: './export-items.component.scss'
})
export class ExportItemsComponent {

  //@Input() itemIds: string[] = [];
  //@Input() item: ItemVersionVO|undefined = undefined;

  @Input() sortQuery: any;
  @Input() completeQuery: any;
  @Input() type: 'exportSelected' | 'exportAll' = 'exportSelected';
  //@ViewChildren(CslAutosuggestComponent) cslAutosuggestComponent!: CslAutosuggestComponent;

  protected readonly exportTypes = exportTypes;
  protected readonly citationTypes = citationTypes;

  protected restUri = environment.inge_rest_uri;

  itemIds: string[] = [];

  selectedExportType: FormControl<string>;
  selectedCitationType: FormControl<string>;
  selectedCslId: FormControl<string>;
  selectedCslName: FormControl<string>;
  selectedSize = 500;
  selectedFrom = 0;

  maxSize = 5000;
  currentCitation: string = '';

  protected loading = false;
  protected errorMessage?: Message;
  private exportSubscription?: Subscription;

  protected atomFeedUrl = "";

  constructor(private itemService: ItemsService, protected activeModal: NgbActiveModal, private selectionService: ItemSelectionService, formBuilder: FormBuilder, private messageService: MessageService, private matomoTracker: MatomoTracker) {

    this.selectedExportType = formBuilder.nonNullable.control(exportTypes.ENDNOTE);
    this.selectedCitationType  = formBuilder.nonNullable.control(citationTypes.APA);
    this.selectedCslId = formBuilder.nonNullable.control("");
    this.selectedCslName = formBuilder.nonNullable.control("");
  }

  ngOnInit() {

    const exportType = localStorage.getItem("exportType");
    if (exportType) {
      const expType: ExportType = JSON.parse(exportType);
      this.selectedExportType.setValue(expType.exportType);
      this.selectedCitationType.setValue(expType.citationType);
      this.selectedCslId.setValue(expType.cslId);
      this.selectedCslId.setValue(expType.cslId);
      this.selectedCslName.setValue(expType.cslName);
    }

    if(this.type === 'exportSelected') {
      this.itemIds = this.selectionService.selectedIds$.value;
    }
    else {
       if (this.completeQuery.size)
       {
         this.selectedSize = this.completeQuery.size;
       }
       else {
         this.selectedSize = 25;
         this.completeQuery.size = 25;
       }
      if (this.completeQuery.from)
      {
        this.selectedFrom = this.completeQuery.from;
      }
      else {
        this.selectedFrom = 0;
        this.completeQuery.from = 0;
      }
    }


    this.loadCitation();
  }

  updateStoredExportInfo() {
    this.errorMessage = undefined;
    const exportType: ExportType = {
      exportType: this.selectedExportType.value,
      citationType: this.selectedCitationType.value,
      cslId: this.selectedCslId.value,
      cslName: this.selectedCslName.value,
    }
    localStorage.setItem("exportType", JSON.stringify(exportType));
  }

  loadCitation() {
    if (!this.isFormat && this.isValid()) {


      this.itemService.retrieveSingleCitation(this.itemIds[0], this.selectedCitationType.value, this.selectedCslId.value, {globalErrorDisplay: false}).subscribe({
        next: (cit) => {
          //console.log('Citation: ' +cit)
          this.currentCitation = cit;
        },
        error: e => {
          this.errorMessage = this.messageService.httpErrorToMessage(e);
          this.loading = false;
        },
      })
    }

  }

  isValid(): boolean {
    return this.itemIds.length > 0 &&
      (this.selectedCitationType.value !== citationTypes.CSL || (this.selectedCslId?.value?.length > 0)) && this.selectedSize <= this.maxSize;
  }

  handleFormatChange($event: Event) {
    this.currentCitation = '';
    this.loadCitation();
    this.updateStoredExportInfo();
  }

  handleCitationChange($event: Event) {
    this.currentCitation = '';
    this.loadCitation();
    this.updateStoredExportInfo();
  }

  handleSizeChange($event: Event) {
    console.log("handleSizeChange", $event,  this.selectedSize);
    this.completeQuery.size = this.selectedSize;
  }

  handleFromChange($event: Event) {
    this.completeQuery.from = this.selectedFrom;
  }

  selectCsl(event: any) {
    if(event) {
      this.selectedCslId.setValue(event.id);
      this.selectedCslName.setValue(event.value);
      if (this.selectedCslId.value)
        this.loadCitation();
      else {
        this.currentCitation = '';
      }

      this.updateStoredExportInfo();
    }
    else {
      this.selectedCslId.setValue('');
      this.currentCitation = '';
    }
    }


  get isFormat() {
    return this.selectedExportType.value === exportTypes.ENDNOTE ||
      this.selectedExportType.value === exportTypes.BIBTEX ||
      this.selectedExportType.value === exportTypes.JSON ||
      this.selectedExportType.value === exportTypes.ESCIDOC_ITEMLIST_XML ||
      this.selectedExportType.value === exportTypes.MARC_XML;

  }

  closeModal() {
    if(this.exportSubscription) {
      this.exportSubscription.unsubscribe();
    }
    this.activeModal.dismiss();
  }

  get downloadLink() {
    return this.restUri + '/items/' + this.itemIds[0]
      + '/export?format=' + this.selectedExportType.value
      + (this.selectedCitationType.value ? '&citation=' + this.selectedCitationType.value : '')
      + (this.selectedCslId.value ? '&cslConeId=' + this.selectedCslId.value : '')
  }

  track(size: number) {
    //this.matomoTracker.trackLink(this.downloadLink, 'download', size);
    let name = this.selectedExportType.value;
    name += this.selectedCitationType.value ? '/' + this.selectedCitationType.value : '';
    name += this.selectedCslId.value ? '/' + this.selectedCslId.value.substring(this.selectedCslId.value.lastIndexOf('/')+1) : '';
    name += '/' + size.toString();

    this.matomoTracker.trackEvent(this.type, name);
  }

  download() {
    const size = this.type === 'exportSelected' ? this.itemIds.length : this.selectedSize;
    this.track(size);
    this.loading = true;
    let searchQuery: any = {};

    if(this.type === 'exportSelected') {
      searchQuery = {
        query: {
          bool: {

            filter: {
              terms: {"_id": this.itemIds}
            },
            ...this.completeQuery && {must: [this.completeQuery.query]}
          }

        },
        size: this.itemIds.length,
        ...this.sortQuery && {sort: this.sortQuery},
      }
    }
    else {
      searchQuery = this.completeQuery;
      searchQuery.size = this.selectedSize;
      searchQuery.from = this.selectedFrom;
    }

    this.exportSubscription = this.itemService.searchAndExport(searchQuery, this.selectedExportType.value, (!this.isFormat) ? this.selectedCitationType.value : undefined, (!this.isFormat && this.selectedCitationType.value === citationTypes.CSL) ? this.selectedCslId.value : undefined, {globalErrorDisplay: false})
      .pipe(
        tap(result => {
          if (result.body) {
            const blob: Blob = result.body;
            console.log("Blob type: " + blob.type);
            const data = window.URL.createObjectURL(blob);
            let filename = "download"


            const contentDispositionHeader = result.headers.get("Content-disposition");
            const parsedContentDisposition = contentDispositionParser(contentDispositionHeader)
            if (parsedContentDisposition) {
              const parsedFileName = parsedContentDisposition['filename']
              if(parsedFileName) {
                filename = parsedFileName;
              }
            }
            const link = document.createElement('a');
            link.href = data;
            link.download = filename;
            link.click();
            window.URL.revokeObjectURL(data);
            link.remove();
            this.loading = false;
          }
        }),
        catchError((err:PubManHttpErrorResponse) => {
          this.errorMessage = this.messageService.httpErrorToMessage(err);
          this.loading = false;
          return EMPTY;
         })
      )
      .subscribe()
  }

  get curlUrl() {
    let url = undefined;
    if(environment.inge_rest_uri?.startsWith("http")) {
      url = new URL(environment.inge_rest_uri + "/items/search");
    } else {
      url = new URL(environment.inge_rest_uri + "/items/search", window.location.origin);
    }

    if(this.selectedExportType.value) url.searchParams.append("format", this.selectedExportType.value);
    if(!this.isFormat) {
      if(this.selectedCitationType.value) url.searchParams.append('citation', this.selectedCitationType.value);
      if(this.selectedCitationType.value === citationTypes.CSL && this.selectedCslId.value) url.searchParams.append('cslConeId', this.selectedCslId.value);
    }

    const curl =
`curl '${url}' \\
-X POST \\
-H 'Content-Type: application/json' \\
-d '${JSON.stringify(this.completeQuery)}'
`;
    return curl;

  }
}

export interface ExportType {
  exportType: string;
  citationType: string;
  cslId: string;
  cslName: string;

}
