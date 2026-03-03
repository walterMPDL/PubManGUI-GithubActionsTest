import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { JsonPipe, KeyValuePipe, NgTemplateOutlet } from "@angular/common";
import { SearchCriterion } from "./criterions/SearchCriterion";
import { LogicalOperator } from "./criterions/operators/LogicalOperator";
import { DisplayType, searchTypes, searchTypesI } from "./criterions/search_config";
import { Parenthesis, PARENTHESIS_TYPE } from "./criterions/operators/Parenthesis";
import { CreatorRole, IdType, ItemVersionState, SubjectClassification } from "../../model/inge";
import { TitleSearchCriterion } from "./criterions/StandardSearchCriterion";
import { OrganizationSearchCriterion, PersonSearchCriterion } from "./criterions/StringOrHiddenIdSearchCriterion";
import { DATE_SEARCH_TYPES, DateSearchCriterion } from "./criterions/DateSearchCriterion";
import { forkJoin, map, Subscription, tap } from "rxjs";
import { OuAutosuggestComponent } from "../shared/ou-autosuggest/ou-autosuggest.component";
import { PersonAutosuggestComponent } from "../shared/person-autosuggest/person-autosuggest.component";
import { GenreListSearchCriterion } from "./criterions/GenreListSearchCriterion";
import { PublicationStateSearchCriterion } from "./criterions/PublicationStateSearchCriterion";
import { COMPONENT_SEARCH_TYPES, FileSectionSearchCriterion } from "./criterions/FileSectionSearchCriterion";
import { FileSectionComponent } from "./file-section-component/file-section-component.component";
import { AaService } from "../../services/aa.service";
import { Clipboard } from "@angular/cdk/clipboard";
import { ItemStateListSearchCriterion } from "./criterions/ItemStateListSearchCriterion";
import { SavedSearchService } from "../../services/pubman-rest-client/saved-search.service";
import { Component, HostListener, ViewEncapsulation } from "@angular/core";
import { ContextListSearchCriterion } from "./criterions/ContextListSearchCriterion";
import { SearchStateService } from "../search-result-list/search-state.service";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import { SortByLabelPipe } from "../../pipes/sort-by-label.pipe";

import { SavedSearchesModalComponent } from "../shared/saved-searches-modal/saved-searches-modal.component";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { AddRemoveButtonsComponent } from "../shared/add-remove-buttons/add-remove-buttons.component";
import { ConeAutosuggestComponent } from "../shared/cone-autosuggest/cone-autosuggest.component";
import { ContextsService } from "../../services/pubman-rest-client/contexts.service";
import { OrganizationsService } from "../../services/pubman-rest-client/organizations.service";
import { BootstrapValidationDirective } from "../../directives/bootstrap-validation.directive";
import { ValidationErrorComponent } from "../shared/validation-error/validation-error.component";
import { MatomoTracker } from "ngx-matomo-client";
import {filter} from "rxjs/operators";
import {ItemSearchAdvancedService} from "./item-search-advanced.service";
import {CopyButtonDirective} from "../../directives/copy-button.directive";
import {MessageService} from "../../services/message.service";

@Component({
  selector: 'pure-item-search-advanced',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    JsonPipe,
    OuAutosuggestComponent,
    PersonAutosuggestComponent,
    FileSectionComponent,
    KeyValuePipe,
    TranslatePipe,
    SortByLabelPipe,
    NgTemplateOutlet,
    AddRemoveButtonsComponent,
    ConeAutosuggestComponent,
    BootstrapValidationDirective,
    ValidationErrorComponent,
    CopyButtonDirective
  ],
  templateUrl: './item-search-advanced.component.html',
  styleUrl: './item-search-advanced.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ItemSearchAdvancedComponent {

  searchForm!: FormGroup;

  result: any;
  query: any;

  identifierOptions = Object.keys(IdType);
  personOptions = Object.keys(CreatorRole);
  currentlyOpenedParenthesis!: Parenthesis | undefined;
  possibleCriterionsForClosingParenthesisMap: SearchCriterion[] = []
  protected readonly DisplayType = DisplayType;

  contextListSearchCriterion!: ContextListSearchCriterion;
  itemStateListSearchCriterion!: ItemStateListSearchCriterion;
  genreListSearchCriterion!: GenreListSearchCriterion;
  publicationStateSearchCriterion!: PublicationStateSearchCriterion;
  fileSectionSearchCriterion!: FileSectionSearchCriterion;
  locatorSectionSearchCriterion!: FileSectionSearchCriterion;

  private logoutSubscription?: Subscription;

  anzGenreCols: number = 0;
  anzGenreRows: number = 0;
  genreRows: number[] = [];
  genreCols: number[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    protected aaService: AaService,
    private savedSearchService: SavedSearchService,
    private clipboard: Clipboard,
    private searchStateService: SearchStateService,
    private translateService: TranslateService,
    private modalService: NgbModal,
    private contextsService: ContextsService,
    private ouService: OrganizationsService,
    private matomoTracker: MatomoTracker,
    private advancedSearchService: ItemSearchAdvancedService,
    private msgService: MessageService,
) {

    this.logoutSubscription = aaService.logout$.pipe(
      filter(val => val===true),
      tap(val => this.reset())
    ).subscribe()
  }

  ngOnInit() {
    this.reset();
    const searchIdParam = this.route.snapshot.queryParamMap.get("searchId");
    const searchFormParam = this.route.snapshot.queryParamMap.get("searchForm");
    if (searchIdParam) {
      this.savedSearchService.retrieve(searchIdParam).subscribe(savedSearch => {
        this.parseFormJson(savedSearch.searchForm);
      })
    }
    else if (searchFormParam) {
      this.parseFormJson(JSON.parse(searchFormParam));
    }

  }

  ngOnDestroy() {
    console.log("Destroying advanced search");
    this.logoutSubscription?.unsubscribe();
  }

  reset(fromJson:any = undefined) {
    if(fromJson) {
      this.searchForm = this.advancedSearchService.initSearchFormFromJson(fromJson);
    }
    else {
      this.searchForm = this.advancedSearchService.initSearchForm(true);
    }

    this.initCriterions();
    this.initializeGenres();
    this.currentlyOpenedParenthesis = undefined;
    this.possibleCriterionsForClosingParenthesisMap = [];
  }

  initCriterions() {
    this.contextListSearchCriterion = this.searchForm.get("contexts") as ContextListSearchCriterion;
    this.itemStateListSearchCriterion = this.searchForm.get("itemStates") as ItemStateListSearchCriterion;
    this.genreListSearchCriterion = this.searchForm.get("genres") as GenreListSearchCriterion;
    this.publicationStateSearchCriterion = this.searchForm.get("publicationState") as PublicationStateSearchCriterion;
    this.fileSectionSearchCriterion = this.searchForm.get("files") as FileSectionSearchCriterion;
    this.locatorSectionSearchCriterion = this.searchForm.get("locators") as FileSectionSearchCriterion;
  }


  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
//    console.log('Fenstergröße geändert', event.target.innerWidth);
    this.initializeGenres();
  }

  initializeGenres() {
    this.anzGenreCols = 3;
    if (window.innerWidth < 768) {
      this.anzGenreCols = 1;
    } else if (window.innerWidth < 1400) {
      this.anzGenreCols = 2;
    }

    this.anzGenreRows = Math.ceil((this.genreListSearchCriterion.genreOptions.length - 1) / this.anzGenreCols); // ohne Thesis
    this.genreRows = Array(this.anzGenreRows).fill(null).map((x, i) => i);
    this.genreCols = Array(this.anzGenreCols).fill(null).map((x, i) => i);
  }



  parseFormJson(formJson: any) {
    //Reset all
    //this.switchToAdmin(false);
    this.reset(formJson);

/*
    for (let [key, value] of Object.entries(formJson)) {

      if (key === "flexibleFields") {
        //Clear old fields
        this.flexibleFields.clear();
        //Recreate flexible search criterions and patch form values
        for (let currentField of (value as any[])) {
          const newSearchCriterion: SearchCriterion = new searchTypes[currentField.type].handlerClass(currentField.type, this.advancedSearchService.servicesForCriterions);
          newSearchCriterion.patchValue(currentField);
          this.flexibleFields.push(newSearchCriterion);
        }
      } else {
        //Just patch the values for genre list, file section etc.
        this.searchForm.patchValue({[key]: value});
      }
    }

 */
  }


  changeType(index: number, newType: string) {
    //console.log("Change criterion at index " + index + " to type " + newType);

    const newSearchCriterion: SearchCriterion = new searchTypes[newType].handlerClass(newType, this.advancedSearchService.servicesForCriterions);
    this.flexibleFields.removeAt(index);
    this.flexibleFields.insert(index, newSearchCriterion);
  }

  changeOperator(index: number, newOperatorType: string) {
    //console.log("Change operator at index " + index + " to type " + newOperatorType);
    const newSearchCriterion = new LogicalOperator(newOperatorType);
    this.flexibleFields.removeAt(index);
    this.flexibleFields.insert(index, newSearchCriterion);
  }

  get flexibleFields(): FormArray {
    return this.searchForm.get("flexibleFields") as FormArray;
  }


  get searchTypes(): searchTypesI {
    return searchTypes;
  }

  get genreListKeys(): string[] {
    return Object.keys((this.genreListSearchCriterion.get('content')?.get('genres') as FormGroup).controls);
    //return this.genreListFormGroup as FormGroup;
  }



  addSearchCriterion(index: number, searchCriterion: SearchCriterion) {

    let newSearchCriterion: SearchCriterion;
    if (DisplayType.PARENTHESIS === this.searchTypes[searchCriterion.type].displayType) {
      newSearchCriterion = new TitleSearchCriterion();
    } else {
      newSearchCriterion = new searchTypes[searchCriterion.type].handlerClass(searchCriterion.type, this.advancedSearchService.servicesForCriterions);
    }

    newSearchCriterion.level = searchCriterion.level;
    this.flexibleFields.insert(index + 1, newSearchCriterion);

    // If the add button of an opening parenthesis is used, the logical operator has to be added
    // after the new criterion
    if (PARENTHESIS_TYPE.OPENING_PARENTHESIS === searchCriterion.type) {
      this.flexibleFields.insert(index + 2, new LogicalOperator("and"));
    } else {
      this.flexibleFields.insert(index + 1, new LogicalOperator("and"));
    }

    this.updateListForClosingParenthesis(this.currentlyOpenedParenthesis);

  }


  removeSearchCriterion(index: number) {

    const sc = this.flexibleFields.at(index) as SearchCriterion;
    this.advancedSearchService.removeSearchCriterionWithOperator(this.flexibleFields.controls as SearchCriterion[], sc);
    this.updateListForClosingParenthesis(this.currentlyOpenedParenthesis);

  }

  addOpeningParenthesis(index: number) {
    this.currentlyOpenedParenthesis = new Parenthesis(PARENTHESIS_TYPE.OPENING_PARENTHESIS);
    this.currentlyOpenedParenthesis.level = (this.flexibleFields.at(index) as SearchCriterion).level;
    // add before criterion
    this.flexibleFields.insert(index, this.currentlyOpenedParenthesis);

    this.updateListForClosingParenthesis(this.currentlyOpenedParenthesis);
    //console.log(this.possibleCriterionsForClosingParenthesisMap);
  }

  addClosingParenthesis(index: number) {
    const closingParenthesis = new Parenthesis(PARENTHESIS_TYPE.CLOSING_PARENTHESIS);
    this.currentlyOpenedParenthesis!.partnerParenthesis = closingParenthesis;
    closingParenthesis.partnerParenthesis = this.currentlyOpenedParenthesis;
    this.currentlyOpenedParenthesis = undefined;
    this.flexibleFields.insert(index + 1, closingParenthesis);
    this.updateListForClosingParenthesis(undefined);
  }

  removeParenthesis(position: number) {
    const parenthesis = this.flexibleFields.at(position) as Parenthesis;
    const partnerParenthesis = parenthesis.partnerParenthesis;

    this.flexibleFields.controls.splice(position, 1);
    if (partnerParenthesis) {
      this.flexibleFields.controls.splice(this.flexibleFields.controls.indexOf(partnerParenthesis), 1);
    }

    if (parenthesis === (this.currentlyOpenedParenthesis)) {
      this.currentlyOpenedParenthesis = undefined;
    }

    this.updateListForClosingParenthesis(this.currentlyOpenedParenthesis);
  }

  private updateListForClosingParenthesis(startParenthesis: Parenthesis | undefined) {
    this.possibleCriterionsForClosingParenthesisMap = [];
    let balanceCounter = 0;
    let lookForClosingParenthesis = false;
    let startParenthesisBalance = 0;

    let numberOfSearchCriterions = 0;

    for (let sc of this.flexibleFields.controls as SearchCriterion[]) {

      if (PARENTHESIS_TYPE.CLOSING_PARENTHESIS === sc.type) {
        balanceCounter--;
        if (lookForClosingParenthesis && balanceCounter <= startParenthesisBalance) {
          lookForClosingParenthesis = false;
        }
      }

      sc.level = balanceCounter;

      if (PARENTHESIS_TYPE.OPENING_PARENTHESIS === sc.type) {
        balanceCounter++;
      }

      if (sc === startParenthesis) {
        lookForClosingParenthesis = true;
        startParenthesisBalance = sc.level;
      }

      if (lookForClosingParenthesis && DisplayType.OPERATOR !== searchTypes[sc.type].displayType
        && balanceCounter === startParenthesisBalance + 1 && sc !== startParenthesis) {
        this.possibleCriterionsForClosingParenthesisMap.push(sc);
      }


      if (DisplayType.OPERATOR !== searchTypes[sc.type].displayType
        && DisplayType.PARENTHESIS !== searchTypes[sc.type].displayType) {
        numberOfSearchCriterions++;
      }
    }

  }


  search() {

    this.advancedSearchService.getElasticsearchQuery(this.searchForm)
      .subscribe(query => {
        this.matomoTracker.trackSiteSearch("ADVANCED_SEARCH", "advanced")
        this.searchStateService.type="advanced";
        this.searchStateService.$currentQuery.next(query);
        this.router.navigateByUrl('/search')
      });

  }

  show_form() {
    //this.result = this.searchForm.value;

    this.result = this.getCleanSearchForm().value;
    console.log(this.result)
    console.log("length of form", JSON.stringify(this.result).length);
  }

  getSearchFormJsonLinkCallback = ()=> {
    //const urlString = window.location.toString();
    const url = new URL(window.location.pathname, window.location.origin);
    const jsonString = JSON.stringify(this.getCleanSearchForm().value);
    url.searchParams.set('searchForm', jsonString);
    console.log("length of form", jsonString.length);
    return url.toString();
  }

  private getCleanSearchForm(): FormGroup<any> {
    const cleanedFlexibleFields = this.advancedSearchService.removeEmptyFields(this.flexibleFields.controls.map(fc => fc as SearchCriterion));
    const searchFormCleaned = this.fb.group({
      ...(cleanedFlexibleFields.length > 0 && {flexibleFields: this.fb.array(cleanedFlexibleFields)}),
      ...(!this.contextListSearchCriterion.isEmpty() && {contexts: this.contextListSearchCriterion.getCleanedForm()}),
      ...(!this.itemStateListSearchCriterion.isEmpty() && {itemStates: this.itemStateListSearchCriterion.getCleanedForm()}),
      ...(!this.genreListSearchCriterion.isEmpty() && {genres: this.genreListSearchCriterion.getCleanedForm()}),
      ...(!this.publicationStateSearchCriterion.isEmpty() && {publicationState: this.publicationStateSearchCriterion.getCleanedForm()}),
      ...(!this.fileSectionSearchCriterion.isEmpty() && {files: this.fileSectionSearchCriterion.getCleanedForm()}),
      ...(!this.locatorSectionSearchCriterion.isEmpty() && {locators:this.locatorSectionSearchCriterion.getCleanedForm()}),

    });
    return searchFormCleaned;
  }

  show_query() {
    this.advancedSearchService.getElasticsearchQuery(this.searchForm).subscribe(query => this.query = query);
  }


  openSavedSearchModal() {
    const comp: SavedSearchesModalComponent = this.modalService.open(SavedSearchesModalComponent, {scrollable: true, size: "lg"}).componentInstance;
    comp.searchFormJson = this.getCleanSearchForm().value;

    comp.applySearchForm.subscribe(data => {
      this.parseFormJson(data);
    })

  }

  switchToAdmin(admin: boolean) {
    if(admin) {

      Object.keys(this.contextListSearchCriterion.contextListFormGroup.controls).forEach(key => {
        this.contextListSearchCriterion.contextListFormGroup.get(key)?.setValue(true);
      })

      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.PENDING.valueOf())?.setValue(true);
      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.SUBMITTED.valueOf())?.setValue(true);
      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.RELEASED.valueOf())?.setValue(true);
      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.IN_REVISION.valueOf())?.setValue(true);
      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.WITHDRAWN.valueOf())?.setValue(false);
    }
    else {

      Object.keys(this.contextListSearchCriterion.contextListFormGroup.controls).forEach(key => {
        this.contextListSearchCriterion.contextListFormGroup.get(key)?.setValue(false);
      })

      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.PENDING.valueOf())?.setValue(false);
      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.SUBMITTED.valueOf())?.setValue(false);
      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.RELEASED.valueOf())?.setValue(true);
      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.IN_REVISION.valueOf())?.setValue(false);
      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.WITHDRAWN.valueOf())?.setValue(false);
    }

  }

  get isAdmin() {
   const anyContextSelected = Object.keys(this.contextListSearchCriterion.contextListFormGroup.controls)
     .map(key => this.contextListSearchCriterion.contextListFormGroup.get(key)?.value)
     .includes(true);

   const anyAdminStatesSelected =
     this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.PENDING.valueOf())?.value == true ||
    this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.SUBMITTED.valueOf())?.value == true ||
    //this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.RELEASED.valueOf())?.value == true ||
    this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.IN_REVISION.valueOf())?.value == true
    //this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.WITHDRAWN.valueOf())?.value == false;

   return anyContextSelected || anyAdminStatesSelected;
  }

  get isPublic() {
    const anyContextSelected = Object.keys(this.contextListSearchCriterion.contextListFormGroup.controls)
      .map(key => this.contextListSearchCriterion.contextListFormGroup.get(key)?.value)
      .includes(true);

    const onlyReleasedSelected =
      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.PENDING.valueOf())?.value == false &&
      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.SUBMITTED.valueOf())?.value == false &&
      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.RELEASED.valueOf())?.value == true &&
      this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.IN_REVISION.valueOf())?.value == false
    //this.itemStateListSearchCriterion.publicationStatesFormGroup.get(ItemVersionState.WITHDRAWN.valueOf())?.value == false;

    return (!anyContextSelected) && onlyReleasedSelected;
  }

  get isValid() {
    return this.searchForm.valid && this.currentlyOpenedParenthesis === undefined && this.flexibleFields.controls.length > 0;
  }


  /**
   * Copies a JSON-based form link to the clipboard when triggered by a specific keyboard shortcut.
   * @param {Event} e - The keyboard event that invokes the method.
   * @return {void} Does not return a value; performs an action of copying the link to the clipboard and displays a success message.
   */
  @HostListener('document:keydown.control.shift.c', ['$event'])
  copyFormJsonLink(e: Event) {
    e.preventDefault();
    this.clipboard.copy(this.getSearchFormJsonLinkCallback());
    this.msgService.success("Secret link copied successfully to clipboard.")


  }

  protected readonly SubjectClassification = SubjectClassification;
}


