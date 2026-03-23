import { Component, effect, EventEmitter, inject, Input, OnInit, Output, ViewChild, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ControlType, FormBuilderService } from '../../../services/form-builder.service';
import {
  AbstractVO,
  AlternativeTitleVO,
  ContextDbVO,
  CreatorRole,
  CreatorType,
  CreatorVO, DegreeType,
  EventVO,
  IdentifierVO,
  LegalCaseVO,
  MdsPublicationGenre,
  PersonVO,
  ProjectInfoVO,
  PublishingInfoVO,
  ReviewMethod,
  SourceVO,
  SubjectClassification,
  SubjectVO
} from 'src/app/model/inge';
import { AltTitleFormComponent } from '../alt-title-form/alt-title-form.component';
import { CreatorFormComponent } from '../creator-form/creator-form.component';
import { AddRemoveButtonsComponent } from 'src/app/components/shared/add-remove-buttons/add-remove-buttons.component';
import { EventFormComponent } from '../event-form/event-form.component';
import { LanguageFormComponent } from '../language-form/language-form.component';
import { LegalCaseFormComponent } from '../legal-case-form/legal-case-form.component';
import { IdentifierFormComponent } from '../identifier-form/identifier-form.component';
import { PublishingInfoFormComponent } from '../publishing-info-form/publishing-info-form.component';
import { SourceFormComponent } from '../source-form/source-form.component';
import { SubjectFormComponent } from '../subject-form/subject-form.component';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';
import { ProjectInfoFormComponent } from '../project-info-form/project-info-form.component';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MiscellaneousService } from 'src/app/services/pubman-rest-client/miscellaneous.service';
import { LoadingComponent } from 'src/app/components/shared/loading/loading.component';
import { ContextsService } from 'src/app/services/pubman-rest-client/contexts.service';
import { AaService } from 'src/app/services/aa.service';
import { MessageService } from 'src/app/services/message.service';
import { Errors } from 'src/app/model/errors';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  AddMultipleCreatorsModalComponent
} from '../add-multiple-creators-modal/add-multiple-creators-modal.component';
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import { BootstrapValidationDirective } from "../../../directives/bootstrap-validation.directive";
import { ValidationErrorComponent } from "../../shared/validation-error/validation-error.component";
import { AccordionGroupValidationDirective } from "../../../directives/accordion-group-validation.directive";
import { catchError, finalize, Subject, takeUntil, tap, throwError } from "rxjs";
import { isEmptyCreator } from "../../../utils/item-utils";
import { ValidationErrorMessageDirective } from "../../../directives/validation-error-message.directive";
import { isControlValueEmpty } from 'src/app/utils/utils_final';
import { hasFormValues } from '../../../utils/utils';


@Component({
  selector: 'pure-metadata-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AbstractFormComponent,
    AddRemoveButtonsComponent,
    AltTitleFormComponent,
    CreatorFormComponent,
    EventFormComponent,
    IdentifierFormComponent,
    LanguageFormComponent,
    LegalCaseFormComponent,
    LoadingComponent,
    PublishingInfoFormComponent,
    SourceFormComponent,
    SubjectFormComponent,
    ProjectInfoFormComponent,
    ScrollingModule,
    CdkDropList,
    CdkDrag,
    TranslatePipe,
    BootstrapValidationDirective,
    ValidationErrorMessageDirective,
    AccordionGroupValidationDirective,
    ValidationErrorComponent
  ],
  templateUrl: './metadata-form.component.html',
  styleUrls: ['./metadata-form.component.scss']
})
export class MetadataFormComponent implements OnInit {


  @Input() meta_form!: FormGroup;
  @Input() context!: FormGroup<ControlType<ContextDbVO>>;
  @Output() notice = new EventEmitter();

  @ViewChild('creatorViewport') creatorViewport?: any;

  aaService = inject(AaService);
  contextService = inject(ContextsService);
  fbs = inject(FormBuilderService);
  messageService = inject(MessageService);
  miscellaneousService = inject(MiscellaneousService);
  cdr = inject(ChangeDetectorRef);
  genreSpecificResource = this.miscellaneousService.genrePropertiesResource;
  /*computed(() => {
    if (this.miscellaneousService.genrePropertiesResource.hasValue()) {
      return this.miscellaneousService.genrePropertiesResource
    }
    return null;
  });
  */

  allowed_genre_types = Object.keys(MdsPublicationGenre);
  review_method_types = Object.keys(ReviewMethod);
  degree_types = Object.keys(DegreeType);
  subject_classification_types = signal<string[]>(Object.keys(SubjectClassification));
  error_types = Errors;

  /** Virtual scroll settings for large creator lists */
  virtualScrollThreshold = 50; // switch to virtual scroll when list exceeds this length
  virtualScrollItemSize = 140; // approximate height (px) of a single creator row
  virtualScrollMaxVisibleItems = 10; // max number of items to render within viewport height

  multipleCreators = new FormControl<string>('');
  loading: boolean = false;
  hasFormValues = hasFormValues;
  creatorControls: Array<FormGroup<ControlType<CreatorVO>>> = [];

  destroy$: Subject<boolean> = new Subject<boolean>();

  genrePriorityList = [MdsPublicationGenre.ARTICLE.toString()
    , MdsPublicationGenre.CONFERENCE_PAPER.toString()
    , MdsPublicationGenre.BOOK_ITEM.toString()
    , MdsPublicationGenre.TALK_AT_EVENT.toString()
    , MdsPublicationGenre.THESIS.toString()];

  constructor(
    private fb: FormBuilder, private modalService: NgbModal, private translateService: TranslateService,
  ) {
    effect(() => {
      // Events
      if (this.genreSpecificResource.value()?.properties.events.display === false) {
        this.event.reset(this.fbs.event_FG(null).value);
      }
      // LegalCase
      if (this.genreSpecificResource.value()?.properties.legal_case.display === false) {
        this.legalCase.reset(this.fbs.legal_case_FG(null).value);
      }
      // PublishingInfo
      if (this.genreSpecificResource.value()?.properties.details_publishing_info.display === false) {
        this.publishingInfo.reset(this.fbs.publishing_info_FG(null).value);
      }
      // ProjectInfo
      if (this.genreSpecificResource.value()?.properties.project_info.display === false) {
        this.projectInfo.reset([this.fbs.project_info_FG(null).value]);
      }
      // Sources
      if (this.genreSpecificResource.value()?.properties.sources.display === false) {
        this.sources.clear();
      }
      else {
        if (this.genreSpecificResource.value()?.properties.sources.optional === false && this.sources.value.length === 0) {
          this.sources.push(this.fbs.source_FG(null));
        } else if (this.genreSpecificResource.value()?.properties.sources.optional === true && this.sources.value.length > 0) {
          this.removeEmptySources();
        }
      }
    });
  }

  ngOnInit() {
    let genre = this.meta_form.get('genre')?.value ? this.meta_form.get('genre')?.value : undefined;
    this.miscellaneousService.selectedGenre.set(genre);
    this.refreshCreatorControls();
    this.updateAllowedGenresAndSubjects(); // Initialize allowed_genre_types with correct context specific values
    this.context.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateAllowedGenresAndSubjects();
      });

    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(lang => { this.updateAllowedGenresAndSubjects() })
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  get alternativeTitles() {
    return this.meta_form.get('alternativeTitles') as FormArray<FormGroup<ControlType<AlternativeTitleVO>>>;
  }

  get creators() {
    return this.meta_form.get('creators') as FormArray<FormGroup<ControlType<CreatorVO>>>;
  }

  get useVirtualScroll(): boolean {
    return this.creators.length > this.virtualScrollThreshold;
  }

  get virtualScrollViewportHeight(): number {
    const visibleItems = Math.min(this.creators.length, this.virtualScrollMaxVisibleItems);
    return visibleItems * this.virtualScrollItemSize;
  }

  trackByCreatorIndex(index: number, item: any): FormGroup<ControlType<CreatorVO>> {
    return item;
  }

  get event() {
    return this.meta_form.get('event') as FormGroup<ControlType<EventVO>>;
  }

  get identifiers() {
    return this.meta_form.get('identifiers') as FormArray<FormGroup<ControlType<IdentifierVO>>>;
  }

  get languages() {
    return this.meta_form.get('languages') as FormArray<FormControl>;
  }

  get legalCase() {
    return this.meta_form.get('legalCase') as FormGroup<ControlType<LegalCaseVO>>;
  }

  get publishingInfo() {
    return this.meta_form.get('publishingInfo') as FormGroup<ControlType<PublishingInfoVO>>;
  }

  get sources() {
    return this.meta_form.get('sources') as FormArray<FormGroup<ControlType<SourceVO>>>;
  }

  get subjects() {
    return this.meta_form.get('subjects') as FormArray<FormGroup<ControlType<SubjectVO>>>;
  }

  get abstracts() {
    return this.meta_form.get('abstracts') as FormArray<FormGroup<ControlType<AbstractVO>>>;
  }

  get projectInfo() {
    return this.meta_form.get('projectInfo') as FormArray<FormGroup<ControlType<ProjectInfoVO>>>;
  }

  updateAllowedGenresAndSubjects() {
    if (this.context.value.objectId) {
      this.contextService.retrieve(this.context.value.objectId,).subscribe(resultContext => {
        if (resultContext.allowedGenres) {
          this.allowed_genre_types = resultContext.allowedGenres;
          this.allowed_genre_types.sort((a, b) => {

            const aIndex = this.genrePriorityList.indexOf(a);
            const bIndex = this.genrePriorityList.indexOf(b);

            if (aIndex !== -1 && bIndex !== -1) {
              return aIndex - bIndex;
            } else if (aIndex !== -1) {
              return -1;
            } else if (bIndex !== -1) {
              return 1;
            } else {
              const translatedA = this.translateService.instant('MdsPublicationGenre.' + a);
              const translatedB = this.translateService.instant('MdsPublicationGenre.' + b);
              return translatedA.localeCompare(translatedB);
            }
          });
        }
        if (resultContext.allowedSubjectClassifications) {
          this.subject_classification_types.set(resultContext.allowedSubjectClassifications.sort());
          console.log('Updated subject_classification_types', this.subject_classification_types())
        } else {
          this.subject_classification_types.set([]);
          console.log('Updated subject_classification_types', this.subject_classification_types())
        }
      });
    }
  }


  changeGenre($event: any) {
    let updatedGenre = $event.target.value;
    this.meta_form.get('genre')?.setValue(updatedGenre);
    this.miscellaneousService.selectedGenre.set(updatedGenre);
    this.genreSpecificResource = this.miscellaneousService.genrePropertiesResource;
  }

  addMultipleCreators(creatorsString: string) {
    this.loading = true;
    if (creatorsString !== null && creatorsString != '') {
      this.miscellaneousService.getDecodedMultiplePersons(creatorsString).pipe(
        tap((decodedCreators) => {
          if (decodedCreators?.length > 0 && this.creators.length > 0) {
            this.creators.clear();
          }
          for (let creator of decodedCreators) {
            let personVO: PersonVO = { completeName: undefined, familyName: creator.family, givenName: creator.given, alternativeNames: undefined, titles: undefined, pseudonyms: undefined, organizations: undefined, identifier: undefined, orcid: undefined };
            let creatorVO: CreatorVO = { person: personVO, role: CreatorRole.AUTHOR, type: CreatorType.PERSON, organization: undefined };
            this.creators.push(this.fbs.creator_FG(creatorVO));

          }
          this.messageService.success('Adding multiple creators successful. Please review the list of creators.');
          this.multipleCreators.setValue('');
        }
        ),
        catchError((error: any) => {
          return throwError(error)
          //this.messageService.error('Error decoding multiple creators. Please check the format and try again. ' + error.message);
          //return [];
        }),
        finalize(() => {
          this.loading = false;
        }
        )
      )
        .subscribe();
    } else {
      this.messageService.error('Please enter multiple creators in the textfield.');
      this.loading = false;
    }
  }

  openAddMultipleCreatorsModal() {
    const modalRef = this.modalService.open(AddMultipleCreatorsModalComponent);
    modalRef.componentInstance.callback = this.addMultipleCreators.bind(this);
  }

  handleAltTitleNotification(event: any) {
    if (event.action === 'add') {
      this.addAltTitle(event.index);
    } else if (event.action === 'remove') {
      this.removeAltTitle(event.index);
    }
  }

  addAltTitle(index: number) {
    this.alternativeTitles.insert(index + 1, this.fbs.alt_title_FG(null));
  }

  removeAltTitle(index: number) {
    this.alternativeTitles.removeAt(index);
  }

  private getCreatorIndex(event: any): number {
    if (typeof event.index === 'number') {
      return event.index;
    }
    // Fallback: try to find by FormGroup instance
    const form = event.creatorForm || event.creator_form || event.form;
    if (form) {
      // Compare by form value instead of reference for robustness
      const foundIndex = this.creators.controls.findIndex(c => c.value === form.value && c === form);
      if (foundIndex !== -1) {
        return foundIndex;
      }
    }
    return -1;
  }

  handleCreatorNotification(event: any) {
    if (event.action === 'add') {
      this.addCreator(this.getCreatorIndex(event));
    } else if (event.action === 'remove') {
      this.removeCreator(this.getCreatorIndex(event));
    } else if (event.action === 'moveUp') {
      this.moveCreatorUp(this.getCreatorIndex(event));
    } else if (event.action === 'moveDown') {
      this.moveCreatorDown(this.getCreatorIndex(event));
    }
  }

  addCreator(index: number) {
    // console.log('current index', index, 'length', this.creators.length)
    this.creators.insert(index + 1, this.fbs.creator_FG(null));
    this.triggerViewportRefresh();
  }

  removeCreator(index: number) {
    this.creators.removeAt(index);
    this.triggerViewportRefresh();
  }

  moveCreatorUp(index: number) {
    if (index > 0) {
      this.moveItemInArray(this.creators, index, index - 1);
    }
  }

  moveCreatorDown(index: number) {
    if (index < this.creators.length - 1) {
      this.moveItemInArray(this.creators, index, index + 1);
    }
  }

  handleIdentifierNotification(event: any) {
    if (event.action === 'add') {
      this.addIdentifier(event.index);
    } else if (event.action === 'remove') {
      this.removeIdentifier(event.index);
    }
  }

  addIdentifier(index: number) {
    this.identifiers.insert(index + 1, this.fbs.identifier_FG(null));
  }

  removeIdentifier(index: number) {
    this.identifiers.removeAt(index);
  }

  handleLanguageNotification(event: any) {
    if (event.action === 'add') {
      this.addLanguage(event.index);
    } else if (event.action === 'remove') {
      this.removeLanguage(event.index);
    }
  }

  addLanguage(index: number) {
    this.languages.insert(index + 1, this.fb.control(''));
  }

  removeLanguage(index: number) {
    this.languages.removeAt(index);
  }

  handleSourceNotification(event: any) {
    if (event.action === 'add') {
      this.addSource(event.index);
    } else if (event.action === 'remove') {
      this.removeSource(event.index);
    }
  }

  addSource(index: number) {
    this.sources.insert(index + 1, this.fbs.source_FG(null));
  }

  removeSource(index: number) {
    this.sources.removeAt(index);
  }

  handleSubjectNotification(event: any) {
    if (event.action === 'add') {
      this.addSubject(event.index);
    } else if (event.action === 'remove') {
      this.removeSubject(event.index);
    }
  }

  addSubject(index: number) {
    this.subjects.insert(index + 1, this.fbs.subject_FG(null));
  }

  removeSubject(index: number) {
    this.subjects.removeAt(index);
  }

  handleAbstractNotification(event: any) {
    if (event.action === 'add') {
      this.addAbstract(event.index);
    } else if (event.action === 'remove') {
      this.removeAbstract(event.index);
    }
  }

  addAbstract(index: number) {
    this.abstracts.insert(index + 1, this.fbs.abstract_FG(null));
  }

  removeAbstract(index: number) {
    this.abstracts.removeAt(index);
  }

  handleProjectInfoNotification(event: any) {
    if (event.action === 'add') {
      this.addProjectInfo(event.index);
    } else if (event.action === 'remove') {
      this.removeProjectInfo(event.index);
    }
  }

  addProjectInfo(index: number) {
    this.projectInfo.insert(index + 1, this.fbs.project_info_FG(null));
  }

  removeProjectInfo(index: number) {
    this.projectInfo.removeAt(index);
  }

  addSourceOnExpand(event: Event) {
    const element: HTMLElement = event.currentTarget as HTMLElement;
    if (this.sources.length === 0 && element.getAttribute("aria-expanded") === "true") {
      this.sources.push(this.fbs.source_FG(null));
    } else if (this.sources.length > 0 && element.getAttribute("aria-expanded") === "false") {
      // Check if sources have no values and remove them
      this.removeEmptySources();
    }
  }

  removeEmptySources() {
    for (let i = this.sources.length - 1; i >= 0; i--) {
      const sourceFormGroup = this.sources.at(i) as FormGroup;
      console.log(sourceFormGroup.value);
      console.log("sourceFormGroup EMPTY Check", isControlValueEmpty(sourceFormGroup))
      if (sourceFormGroup.pristine && isControlValueEmpty(sourceFormGroup)) {
        this.sources.removeAt(i);
      }
    }
  }

  dropCreator(event: CdkDragDrop<string[]>) {
    this.moveItemInArray(this.creators, event.previousIndex, event.currentIndex);
  }

  /** Copied from Angular CDK to make our FormArrays work with drag and drop */
  moveItemInArray<T = any>(array: FormArray<FormGroup<ControlType<T>>>, fromIndex: number, toIndex: number): void {
    let object: any = array.at(fromIndex);
    array.removeAt(fromIndex);
    array.insert(toIndex, object);

    this.triggerViewportRefresh();
  }

  triggerViewportRefresh() {
    this.refreshCreatorControls();

    // Trigger change detection so virtual scroll recognizes the reordering
    this.cdr.detectChanges();

    // Force virtual scroll to re-evaluate the view (necessary for repaint after reordering)
    try {
      this.creatorViewport?.checkViewportSize();
    } catch (e) {
      console.warn('creatorViewport update failed', e);
    }
  }

  private refreshCreatorControls() {
    this.creatorControls = [...this.creators.controls] as Array<FormGroup<ControlType<CreatorVO>>>;
  }
}
