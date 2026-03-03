import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  AbstractVO,
  AlternativeTitleVO,
  ChecksumAlgorithm,
  ContextDbRO,
  CreatorType,
  CreatorVO,
  EventVO,
  FileDbVO,
  FormatVO,
  FundingInfoVO,
  FundingOrganizationVO,
  FundingProgramVO,
  IdentifierVO,
  InvitationStatus,
  ItemVersionState,
  ItemVersionVO,
  LegalCaseVO,
  MdsFileVO,
  MdsPublicationGenre,
  MdsPublicationVO,
  OA_STATUS,
  OrganizationVO,
  PersonVO,
  ProjectInfoVO,
  PublishingInfoVO,
  ReviewMethod,
  SourceVO,
  Storage,
  SubjectVO,
  Visibility
} from 'src/app/model/inge';
import { creatorValidator } from 'src/app/directives/validation/creator-validation.directive';
import { CreatorsOrganizationsValidator } from 'src/app/directives/validation/creators-organizations-validation.directive';
import { datesValidator } from 'src/app/directives/validation/dates-validation.directive';
import { EventValidator } from 'src/app/directives/validation/event-validation.directive';
import { IdentifierValidator } from 'src/app/directives/validation/identifier-validation.directive';
import { SourceRequiredValidator } from 'src/app/directives/validation/source-required-validation.directive';
import { SourceValidator } from 'src/app/directives/validation/source-validation.directive';
import { SubjectValidator } from 'src/app/directives/validation/subject-validation.directive';
import { Utf8Validator } from 'src/app/directives/validation/utf8-validation.directive';
import { fileDataValidator } from 'src/app/directives/validation/file-data-validation';
import { alternativeTitleValidator } from "../directives/validation/alternative-title.validation.directive";
import { requiredNoWhitespace } from "../directives/validation/required-no-whitespace-validation.directive";
import { DegreeRequiredValidator } from "../directives/validation/degree-required-validation.directive";

type Unbox<T> = T extends Array<infer V> ? V : T;

export type ControlType<T> = {
  [K in keyof T]: T[K] extends Array<any>
  ? FormArray<AbstractControl<Unbox<T[K]>>>
  : T[K] extends Record<string, any>
  ? FormGroup<ControlType<T[K]>>
  : AbstractControl<T[K] | undefined>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ORCID_PATTERN = /^http[s]?:\/\/orcid.org\/(\d{4})-(\d{4})-(\d{4})-(\d{3}[0-9X])$/;
export const DATE_PATTERN = /^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/;
export const FILE_TITLE_AND_NAME_PATTERN = /^[^/]+$/;
export const DOI_PATTERN = /^10.\d{4,9}\/[-._;()\/:A-Z0-9]+$/i;
export const STRONG_PASSWORD_REGEX_PATTERN: RegExp =
  /^(?=[^A-Z]*[A-Z])(?=[^a-z]*[a-z])(?=\D*\d)(?=.*[!"#$%&'()*+,\-./;<=>?@[\\\]^_`{|}~]).{8,32}$/;
export const URL_PATTERN = /^(https?:\/\/|ftp:\/\/).*/;

const VALIDATION_UPDATE_ON = 'change';
@Injectable({
  providedIn: 'root'
})
export class FormBuilderService {

  constructor(
    private fb: FormBuilder,
  ) { }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Helper method to update FormArray with new data
   * Reuses existing controls when possible, adds/removes as needed
   */
  private updateFormArray<T>(
    formArray: FormArray,
    newData: T[],
    updateOrCreateFn: (item: T, existingControl?: AbstractControl) => AbstractControl
  ): void {
    const targetLength = newData.length;
    const currentLength = formArray.length;

    // Update existing controls
    for (let i = 0; i < Math.min(currentLength, targetLength); i++) {
      const result = updateOrCreateFn(newData[i], formArray.at(i));
      // If a new control was returned, replace the old one
      if (result !== formArray.at(i)) {
        formArray.setControl(i, result);
      }
    }

    // Remove excess controls
    while (formArray.length > targetLength) {
      formArray.removeAt(formArray.length - 1);
    }

    // Add missing controls
    for (let i = currentLength; i < targetLength; i++) {
      formArray.push(updateOrCreateFn(newData[i]));
    }
  }

  /**
   * Helper method to update FormArray containing primitive values
   */
  private updatePrimitiveArray(formArray: FormArray, newData: any[]): void {
    this.updateFormArray(formArray, newData, (item, existingControl) => {
      if (existingControl) {
        existingControl.setValue(item);
        return existingControl;
      }
      return this.fb.nonNullable.control(item);
    });
  }

  // ============================================================================
  // CREATION METHODS (EXISTING)
  // ============================================================================

  item_FG(item: ItemVersionVO | null) {
    const item_form = this.fb.group<ControlType<ItemVersionVO>>({
      context: item?.context ? this.context_FG(item.context) : this.context_FG(null),
      files: this.fb.array(item?.files ? item.files.map(file => this.file_FG(file) as AbstractControl) : []),
      localTags: this.fb.array(item?.localTags ? item.localTags.map(lt => this.fb.nonNullable.control(lt) as AbstractControl) : []),
      metadata: item?.metadata ? this.metadata_FG(item.metadata) : this.metadata_FG(null),
      message: this.fb.nonNullable.control(item?.message ? item.message : undefined),
      modificationDate: this.fb.nonNullable.control(item?.modificationDate ? item.modificationDate : undefined),
      objectId: this.fb.nonNullable.control(item?.objectId ? item.objectId : undefined),
      publicState: this.fb.nonNullable.control(item?.publicState ? item.publicState : ItemVersionState.PENDING),
      versionNumber: this.fb.nonNullable.control(item?.versionNumber ? item.versionNumber : undefined),
    });
    return item_form;
  }

  context_FG(ctx: ContextDbRO | null) {
    const ctx_form = this.fb.group<ControlType<ContextDbRO>>({
      objectId: this.fb.nonNullable.control(ctx?.objectId ? ctx.objectId : undefined, {validators: [Validators.required], updateOn: VALIDATION_UPDATE_ON}),
      name: this.fb.nonNullable.control(ctx?.name ? ctx.name : undefined)
    });
    return ctx_form;
  }

  file_FG(file: FileDbVO | null) {
    const file_form = this.fb.group<ControlType<FileDbVO>>({
        objectId: this.fb.nonNullable.control(file?.objectId ? file.objectId : undefined),
        name: this.fb.nonNullable.control(file?.name ? file.name : undefined),
        visibility: this.fb.nonNullable.control(file?.visibility ? file.visibility : Visibility.PUBLIC),
        pid: this.fb.nonNullable.control(file?.pid ? file.pid : undefined),
        content: this.fb.nonNullable.control(file?.content ? file.content : undefined),
        storage: this.fb.nonNullable.control(file?.storage ? file.storage : Storage.EXTERNAL_URL),
        checksum: this.fb.nonNullable.control(file?.checksum ? file.checksum : undefined),
        checksumAlgorithm: this.fb.nonNullable.control(file?.checksumAlgorithm ? file.checksumAlgorithm : ChecksumAlgorithm.MD5),
        mimeType: this.fb.nonNullable.control(file?.mimeType ? file.mimeType : undefined),
        size: this.fb.nonNullable.control(file?.size ? file.size : undefined),
        metadata: file?.metadata ? this.mds_file_FG(file.metadata) : this.mds_file_FG(null),
        allowedAudienceIds: this.fb.array(file?.allowedAudienceIds ? file.allowedAudienceIds.map(audiencId => this.fb.nonNullable.control(audiencId) as AbstractControl) : []),
        sortkz: this.fb.nonNullable.control(file?.sortkz ? file.sortkz : undefined),
      },
      { validators: [fileDataValidator], updateOn: VALIDATION_UPDATE_ON });
    return file_form;
  }

  mds_file_FG(fileMetadata: MdsFileVO | null) {
    const mdsFile_form = this.fb.group<ControlType<MdsFileVO>>({
      //title validations are handled by file-data-validation.ts
      title: this.fb.nonNullable.control(fileMetadata?.title ? fileMetadata.title : undefined),
      //contentCategory validations are handled by file-data-validation.ts
      contentCategory: this.fb.nonNullable.control(fileMetadata?.contentCategory ? fileMetadata.contentCategory : undefined),
      description: this.fb.nonNullable.control(fileMetadata?.description ? fileMetadata.description : undefined),
      identifiers: this.fb.array(fileMetadata?.identifiers ? fileMetadata.identifiers.map(id => this.identifier_FG(id) as AbstractControl) : []),
      formats: this.fb.array(fileMetadata?.formats ? fileMetadata.formats.map(format => this.format_FG(format) as AbstractControl) : []),
      size: this.fb.nonNullable.control(fileMetadata?.size ? fileMetadata.size : undefined),
      embargoUntil: this.fb.nonNullable.control(fileMetadata?.embargoUntil ? fileMetadata.embargoUntil : undefined, { validators: [Validators.pattern(DATE_PATTERN)], updateOn: VALIDATION_UPDATE_ON  }),
      copyrightDate: this.fb.nonNullable.control(fileMetadata?.copyrightDate ? fileMetadata.copyrightDate : undefined, { validators: [Validators.pattern(DATE_PATTERN)], updateOn: VALIDATION_UPDATE_ON  }),
      rights: this.fb.nonNullable.control(fileMetadata?.rights ? fileMetadata.rights : undefined),
      license: this.fb.nonNullable.control(fileMetadata?.license ? fileMetadata.license : undefined, { validators: [Validators.pattern(URL_PATTERN)], updateOn: VALIDATION_UPDATE_ON  }),
      oaStatus: this.fb.nonNullable.control(fileMetadata?.oaStatus ? fileMetadata.oaStatus : OA_STATUS.NOT_SPECIFIED),
    });
    return mdsFile_form;
  }

  format_FG(format: FormatVO | null) {
    const format_form = this.fb.group<ControlType<FormatVO>>({
      value: this.fb.nonNullable.control(format?.value ? format.value : undefined),
      type: this.fb.nonNullable.control(format?.type ? format.type : undefined),
    });
    return format_form;
  }


  alt_title_FG(at: AlternativeTitleVO | null) {
    const atf = this.fb.group<ControlType<AlternativeTitleVO>>({
      type: this.fb.nonNullable.control(at?.type ? at.type : undefined),
      language: this.fb.nonNullable.control(at?.language ? at.language : undefined),
      value: this.fb.nonNullable.control(at?.value ? at.value : undefined, { validators: [Utf8Validator], updateOn: VALIDATION_UPDATE_ON }),
    }, { validators: [alternativeTitleValidator], updateOn: VALIDATION_UPDATE_ON });
    return atf;
  }

  creator_FG(creator: CreatorVO | null) {
    const creator_form = this.fb.group<ControlType<CreatorVO>>({
        organization: creator?.organization ? this.organization_FG(creator.organization) : this.organization_FG(null),
        person: creator?.person ? this.person_FG(creator.person) : this.person_FG(null),
        role: this.fb.nonNullable.control(creator?.role ? creator.role : undefined),
        type: this.fb.nonNullable.control(creator?.type ? creator.type : CreatorType.PERSON)
      },
      { validators: [creatorValidator], updateOn: VALIDATION_UPDATE_ON }
    );
    creator?.organization ? creator_form.get('person')?.disable() : creator_form.get('organization')?.disable();
    return creator_form;
  }

  organization_FG(ou: OrganizationVO | null) {
    const ou_form = this.fb.group<ControlType<OrganizationVO>>({
      name: this.fb.nonNullable.control(ou?.name ? ou.name : undefined),
      identifier: this.fb.nonNullable.control(ou?.identifier ? ou.identifier : undefined),
      identifierPath: this.fb.array(ou?.identifierPath ? ou.identifierPath.map(s => this.fb.nonNullable.control(s) as AbstractControl) : []),
      address: this.fb.nonNullable.control(ou?.address ? ou.address : undefined),
    });
    return ou_form;
  }

  person_FG(person: PersonVO | null) {
    const person_form = this.fb.group<ControlType<PersonVO>>({
      givenName: this.fb.nonNullable.control(person?.givenName ? person.givenName : undefined),
      familyName: this.fb.nonNullable.control(person?.familyName ? person.familyName : undefined),
      completeName: this.fb.nonNullable.control(person?.completeName ? person.completeName : undefined),
      titles: this.fb.array(person?.titles ? person.titles.map(t => this.fb.nonNullable.control(t) as AbstractControl) : []),
      alternativeNames: this.fb.array(person?.alternativeNames ? person.alternativeNames.map(an => this.fb.nonNullable.control(an) as AbstractControl) : []),
      pseudonyms: this.fb.array(person?.pseudonyms ? person.pseudonyms.map(p => this.fb.nonNullable.control(p) as AbstractControl) : []),
      orcid: this.fb.nonNullable.control(person?.orcid ? person.orcid : undefined, { validators: [Validators.pattern(ORCID_PATTERN)], updateOn: VALIDATION_UPDATE_ON }),
      identifier: person?.identifier ? this.identifier_FG(person.identifier) : this.identifier_FG(null),
      organizations: this.fb.array(person?.organizations ? person.organizations.map(ou => this.organization_FG(ou) as AbstractControl) : [])
    });
    return person_form;
  }

  identifier_FG(identifier: IdentifierVO | null, addValidations:boolean = true) {
    const identifier_form = this.fb.group<ControlType<IdentifierVO>>({
        id: this.fb.nonNullable.control(identifier?.id ? identifier.id : undefined),
        type: this.fb.nonNullable.control(identifier?.type ? identifier.type : undefined)
      },
      addValidations ? { validators: [IdentifierValidator], updateOn: VALIDATION_UPDATE_ON } : {});
    return identifier_form;
  }

  metadata_FG(metadata: MdsPublicationVO | null) {
    const metadata_form = this.fb.group<ControlType<MdsPublicationVO>>({
        title: this.fb.nonNullable.control(metadata?.title ? metadata.title : undefined, { validators: [requiredNoWhitespace, Utf8Validator], updateOn: VALIDATION_UPDATE_ON }),
        alternativeTitles: this.fb.array(metadata?.alternativeTitles ? metadata.alternativeTitles.map(at => this.alt_title_FG(at) as AbstractControl) : []),
        creators: this.fb.array(metadata?.creators ? metadata.creators.map(creator => this.creator_FG(creator) as AbstractControl) : [this.creator_FG(null)], {validators: [CreatorsOrganizationsValidator], updateOn: VALIDATION_UPDATE_ON}),
        dateAccepted: this.fb.nonNullable.control(metadata?.dateAccepted ? metadata.dateAccepted : undefined, { validators: [Validators.pattern(DATE_PATTERN)], updateOn: VALIDATION_UPDATE_ON }),
        dateCreated: this.fb.nonNullable.control(metadata?.dateCreated ? metadata.dateCreated : undefined, { validators: [Validators.pattern(DATE_PATTERN)], updateOn: VALIDATION_UPDATE_ON }),
        dateModified: this.fb.nonNullable.control(metadata?.dateModified ? metadata.dateModified : undefined, { validators: [Validators.pattern(DATE_PATTERN)], updateOn: VALIDATION_UPDATE_ON }),
        datePublishedInPrint: this.fb.nonNullable.control(metadata?.datePublishedInPrint ? metadata.datePublishedInPrint : undefined, { validators: [Validators.pattern(DATE_PATTERN)], updateOn: VALIDATION_UPDATE_ON }),
        datePublishedOnline: this.fb.nonNullable.control(metadata?.datePublishedOnline ? metadata.datePublishedOnline : undefined, { validators: [Validators.pattern(DATE_PATTERN)], updateOn: VALIDATION_UPDATE_ON }),
        dateSubmitted: this.fb.nonNullable.control(metadata?.dateSubmitted ? metadata.dateSubmitted : undefined, { validators: [Validators.pattern(DATE_PATTERN)], updateOn: VALIDATION_UPDATE_ON }),
        degree: this.fb.nonNullable.control(metadata?.degree ? metadata.degree : undefined, { validators: [DegreeRequiredValidator], updateOn: VALIDATION_UPDATE_ON }),
        duration: this.fb.nonNullable.control(metadata?.duration ? metadata.duration : undefined),
        event: metadata?.event ? this.event_FG(metadata.event) : this.event_FG(null),
        legalCase: metadata?.legalCase ? this.legal_case_FG(metadata.legalCase) : this.legal_case_FG(null),
        genre: this.fb.nonNullable.control(metadata?.genre ? metadata.genre : MdsPublicationGenre.ARTICLE),
        identifiers: this.fb.array(metadata?.identifiers ? metadata.identifiers.map(id => this.identifier_FG(id) as AbstractControl) : [this.identifier_FG(null)]),
        languages: this.fb.array(metadata?.languages ? metadata.languages.map(l => this.fb.nonNullable.control(l) as AbstractControl) : [this.fb.nonNullable.control(null)]),
        location: this.fb.nonNullable.control(metadata?.location ? metadata.location : undefined),
        publishingInfo: metadata?.publishingInfo ? this.publishing_info_FG(metadata.publishingInfo) : this.publishing_info_FG(null),
        reviewMethod: this.fb.nonNullable.control(metadata?.reviewMethod ? metadata.reviewMethod : undefined),
        sources: this.fb.array(metadata?.sources ? metadata.sources.map(s => this.source_FG(s) as AbstractControl) : []),
        freeKeywords: this.fb.nonNullable.control(metadata?.freeKeywords ? metadata.freeKeywords : undefined),
        subjects: this.fb.array(metadata?.subjects ? metadata.subjects.map(s => this.subject_FG(s) as AbstractControl) : []),
        tableOfContents: this.fb.nonNullable.control(metadata?.tableOfContents ? metadata.tableOfContents : undefined),
        totalNumberOfPages: this.fb.nonNullable.control(metadata?.totalNumberOfPages ? metadata.totalNumberOfPages : undefined),
        abstracts: this.fb.array(metadata?.abstracts ? metadata.abstracts.map(a => this.abstract_FG(a) as AbstractControl) : [this.abstract_FG(null)]),
        projectInfo: this.fb.array(metadata?.projectInfo ? metadata.projectInfo.map(pi => this.project_info_FG(pi) as AbstractControl) : [this.project_info_FG(null)]),
      },
      { validators: [datesValidator, SourceRequiredValidator], updateOn: VALIDATION_UPDATE_ON }
    );
    return metadata_form;
  }

  source_FG(source: SourceVO | null) {
    const source_form = this.fb.group<ControlType<SourceVO>>({
        alternativeTitles: this.fb.array(source?.alternativeTitles ? source.alternativeTitles.map(at => this.alt_title_FG(at) as AbstractControl) : []),
        title: this.fb.nonNullable.control(source?.title ? source.title : undefined, { validators: [requiredNoWhitespace], updateOn: VALIDATION_UPDATE_ON }),
        creators: this.fb.array(source?.creators ? source.creators.map(c => this.creator_FG(c) as AbstractControl) : []),
        volume: this.fb.nonNullable.control(source?.volume ? source.volume : undefined),
        issue: this.fb.nonNullable.control(source?.issue ? source.issue : undefined),
        // datePublishedInPrint: this.fb.nonNullable.control(source?.datePublishedInPrint ? source.datePublishedInPrint : new Date(), { validators: [Validators.pattern(DATE_PATTERN)], updateOn: VALIDATION_UPDATE_ON }),
        startPage: this.fb.nonNullable.control(source?.startPage ? source.startPage : undefined),
        endPage: this.fb.nonNullable.control(source?.endPage ? source.endPage : undefined),
        sequenceNumber: this.fb.nonNullable.control(source?.sequenceNumber ? source.sequenceNumber : undefined),
        publishingInfo: source?.publishingInfo ? this.publishing_info_FG(source.publishingInfo) : this.publishing_info_FG(null),
        identifiers: this.fb.array(source?.identifiers ? source.identifiers.map(i => this.identifier_FG(i) as AbstractControl) : [this.identifier_FG(null)]),
        // sources: this.fb.array(source?.sources ? source.sources.map(s => this.source_FG(s) as any) : [this.source_FG(null)]),
        genre: this.fb.nonNullable.control(source?.genre ? source.genre : undefined),
        totalNumberOfPages: this.fb.nonNullable.control(source?.totalNumberOfPages ? source.totalNumberOfPages : undefined),
      },
      { validators: [SourceValidator], updateOn: VALIDATION_UPDATE_ON });
    return source_form;
  }

  event_FG(event: EventVO | null) {
    const event_form: any = this.fb.group<ControlType<EventVO>>({
        endDate: this.fb.nonNullable.control(event?.endDate ? event.endDate : undefined, { validators: [Validators.pattern(DATE_PATTERN)], updateOn: VALIDATION_UPDATE_ON }),
        invitationStatus: this.fb.nonNullable.control(event?.invitationStatus ? event.invitationStatus : undefined),
        place: this.fb.nonNullable.control(event?.place ? event.place : undefined),
        startDate: this.fb.nonNullable.control(event?.startDate ? event.startDate : undefined, { validators: [Validators.pattern(DATE_PATTERN)], updateOn: VALIDATION_UPDATE_ON }),
        title: this.fb.nonNullable.control(event?.title ? event.title : undefined)
      },
      {
        validators: [EventValidator],
        updateOn: VALIDATION_UPDATE_ON // 'blur' or 'change' or 'submit'
      });
    return event_form;
  }

  legal_case_FG(legal_case: LegalCaseVO | null) {
    const case_form = this.fb.group<ControlType<LegalCaseVO>>({
      courtName: this.fb.nonNullable.control(legal_case?.courtName ? legal_case.courtName : undefined),
      title: this.fb.nonNullable.control(legal_case?.title ? legal_case.title : undefined),
      identifier: this.fb.nonNullable.control(legal_case?.identifier ? legal_case.identifier : undefined),
      datePublished: this.fb.nonNullable.control(legal_case?.datePublished ? legal_case.datePublished : undefined, { validators: [Validators.pattern(DATE_PATTERN)], updateOn: VALIDATION_UPDATE_ON })
    });
    return case_form;
  }

  publishing_info_FG(info: PublishingInfoVO | null) {
    const info_form = this.fb.group<ControlType<PublishingInfoVO>>({
      edition: this.fb.nonNullable.control(info?.edition ? info.edition : undefined),
      place: this.fb.nonNullable.control(info?.place ? info.place : undefined),
      publisher: this.fb.nonNullable.control(info?.publisher ? info.publisher : undefined)
    });
    return info_form
  }

  subject_FG(subject: SubjectVO | null) {
    const subject_form = this.fb.group<ControlType<SubjectVO>>({
        language: this.fb.nonNullable.control(subject?.language ? subject.language : undefined),
        value: this.fb.nonNullable.control(subject?.value ? subject.value : undefined),
        type: this.fb.nonNullable.control(subject?.type ? subject.type : undefined)
      },
      { validators: [SubjectValidator], updateOn: VALIDATION_UPDATE_ON });
    return subject_form
  }

  abstract_FG(abstract: AbstractVO | null) {
    const abstract_form = this.fb.group<ControlType<AbstractVO>>({
      language: this.fb.nonNullable.control(abstract?.language ? abstract.language : undefined),
      value: this.fb.nonNullable.control(abstract?.value ? abstract.value : undefined, { validators: [Utf8Validator], updateOn: VALIDATION_UPDATE_ON })
    });
    return abstract_form
  }

  project_info_FG(pi: ProjectInfoVO | null) {
    const pi_form = this.fb.group<ControlType<ProjectInfoVO>>({
      title: this.fb.nonNullable.control(pi?.title ? pi.title : undefined),
      fundingInfo: pi?.fundingInfo ? this.funding_info_FG(pi.fundingInfo) : this.funding_info_FG(null),
      grantIdentifier: pi?.grantIdentifier ? this.identifier_FG(pi.grantIdentifier, false) : this.identifier_FG(null, false)
    });
    return pi_form
  }

  funding_info_FG(fi: FundingInfoVO | null) {
    const fi_form = this.fb.group<ControlType<FundingInfoVO>>({
      fundingOrganization: fi?.fundingOrganization ? this.funding_org_FG(fi.fundingOrganization) : this.funding_org_FG(null),
      fundingProgram: fi?.fundingProgram ? this.funding_prog_FG(fi.fundingProgram) : this.funding_prog_FG(null)
    });
    return fi_form;
  }

  funding_org_FG(fo: FundingOrganizationVO | null) {
    const fo_form = this.fb.group<ControlType<FundingOrganizationVO>>({
      title: this.fb.nonNullable.control(fo?.title ? fo.title : undefined),
      identifiers: this.fb.array(fo?.identifiers ? fo.identifiers.map(i => this.identifier_FG(i, false) as AbstractControl) : [])
    });
    return fo_form
  }

  funding_prog_FG(fp: FundingProgramVO | null) {
    const fp_form = this.fb.group<ControlType<FundingProgramVO>>({
      title: this.fb.nonNullable.control(fp?.title ? fp.title : undefined),
      identifiers: this.fb.array(fp?.identifiers ? fp.identifiers.map(i => this.identifier_FG(i, false) as AbstractControl) : [])
    });
    return fp_form
  }

  // ============================================================================
  // UPDATE METHODS
  // ============================================================================

  /**
   * Update an existing item FormGroup with new data
   */
  updateItem_FG(form: FormGroup<ControlType<ItemVersionVO>>, item: ItemVersionVO | null): void {
    this.updateContext_FG(form.get('context') as FormGroup<ControlType<ContextDbRO>>, item?.context || null);

    const filesArray = form.get('files') as FormArray;
    this.updateFormArray(filesArray, item?.files || [], (file, fg) =>
      fg ? this.updateFile_FG(fg as FormGroup<ControlType<FileDbVO>>, file) : this.file_FG(file)
    );

    const localTagsArray = form.get('localTags') as FormArray;
    this.updatePrimitiveArray(localTagsArray, item?.localTags || []);

    this.updateMetadata_FG(form.get('metadata') as FormGroup<ControlType<MdsPublicationVO>>, item?.metadata || null);

    form.patchValue({
      message: item?.message || undefined,
      modificationDate: item?.modificationDate || undefined,
      objectId: item?.objectId || undefined,
      publicState: item?.publicState || ItemVersionState.PENDING,
      versionNumber: item?.versionNumber || undefined,
    });
  }

  /**
   * Update an existing context FormGroup with new data
   */
  updateContext_FG(form: FormGroup<ControlType<ContextDbRO>>, ctx: ContextDbRO | null): void {
    form.patchValue({
      objectId: ctx?.objectId || undefined,
      name: ctx?.name || undefined
    });
  }

  /**
   * Update an existing file FormGroup with new data
   */
  updateFile_FG(form: FormGroup<ControlType<FileDbVO>>, file: FileDbVO | null): FormGroup<ControlType<FileDbVO>> {
    this.updateMdsFile_FG(form.get('metadata') as FormGroup<ControlType<MdsFileVO>>, file?.metadata || null);

    const allowedAudienceArray = form.get('allowedAudienceIds') as FormArray;
    this.updatePrimitiveArray(allowedAudienceArray, file?.allowedAudienceIds || []);

    form.patchValue({
      objectId: file?.objectId || undefined,
      name: file?.name || undefined,
      visibility: file?.visibility || Visibility.PUBLIC,
      pid: file?.pid || undefined,
      content: file?.content || undefined,
      storage: file?.storage || Storage.EXTERNAL_URL,
      checksum: file?.checksum || undefined,
      checksumAlgorithm: file?.checksumAlgorithm || ChecksumAlgorithm.MD5,
      mimeType: file?.mimeType || undefined,
      size: file?.size || undefined,
      sortkz: file?.sortkz || undefined,
    });

    return form;
  }

  /**
   * Update an existing MDS file metadata FormGroup with new data
   */
  updateMdsFile_FG(form: FormGroup<ControlType<MdsFileVO>>, fileMetadata: MdsFileVO | null): void {
    const identifiersArray = form.get('identifiers') as FormArray;
    this.updateFormArray(identifiersArray, fileMetadata?.identifiers || [], (id, fg) =>
      fg ? this.updateIdentifier_FG(fg as FormGroup<ControlType<IdentifierVO>>, id) : this.identifier_FG(id)
    );

    const formatsArray = form.get('formats') as FormArray;
    this.updateFormArray(formatsArray, fileMetadata?.formats || [], (format, fg) =>
      fg ? this.updateFormat_FG(fg as FormGroup<ControlType<FormatVO>>, format) : this.format_FG(format)
    );

    form.patchValue({
      title: fileMetadata?.title || undefined,
      contentCategory: fileMetadata?.contentCategory || undefined,
      description: fileMetadata?.description || undefined,
      size: fileMetadata?.size || undefined,
      embargoUntil: fileMetadata?.embargoUntil || undefined,
      copyrightDate: fileMetadata?.copyrightDate || undefined,
      rights: fileMetadata?.rights || undefined,
      license: fileMetadata?.license || undefined,
      oaStatus: fileMetadata?.oaStatus || OA_STATUS.NOT_SPECIFIED,
    });
  }

  /**
   * Update an existing format FormGroup with new data
   */
  updateFormat_FG(form: FormGroup<ControlType<FormatVO>>, format: FormatVO | null): FormGroup<ControlType<FormatVO>> {
    form.patchValue({
      value: format?.value || undefined,
      type: format?.type || undefined,
    });
    return form;
  }

  /**
   * Update an existing alternative title FormGroup with new data
   */
  updateAltTitle_FG(form: FormGroup<ControlType<AlternativeTitleVO>>, at: AlternativeTitleVO | null): FormGroup<ControlType<AlternativeTitleVO>> {
    form.patchValue({
      type: at?.type || undefined,
      language: at?.language || undefined,
      value: at?.value || undefined,
    });
    return form;
  }

  /**
   * Update an existing creator FormGroup with new data
   */
  updateCreator_FG(form: FormGroup<ControlType<CreatorVO>>, creator: CreatorVO | null): FormGroup<ControlType<CreatorVO>> {
    if (creator?.organization) {
      this.updateOrganization_FG(form.get('organization') as FormGroup<ControlType<OrganizationVO>>, creator.organization);
      form.get('organization')?.enable();
      form.get('person')?.disable();
    } else if (creator?.person) {
      this.updatePerson_FG(form.get('person') as FormGroup<ControlType<PersonVO>>, creator.person);
      form.get('person')?.enable();
      form.get('organization')?.disable();
    } else {
      form.get('person')?.enable();
      form.get('organization')?.disable();
    }

    form.patchValue({
      role: creator?.role || undefined,
      type: creator?.type || CreatorType.PERSON,
    });

    return form;
  }

  /**
   * Update an existing organization FormGroup with new data
   */
  updateOrganization_FG(form: FormGroup<ControlType<OrganizationVO>>, ou: OrganizationVO | null): void {
    const identifierPathArray = form.get('identifierPath') as FormArray;
    this.updatePrimitiveArray(identifierPathArray, ou?.identifierPath || []);

    form.patchValue({
      name: ou?.name || undefined,
      identifier: ou?.identifier || undefined,
      address: ou?.address || undefined,
    });
  }

  /**
   * Update an existing person FormGroup with new data
   */
  updatePerson_FG(form: FormGroup<ControlType<PersonVO>>, person: PersonVO | null): void {
    const titlesArray = form.get('titles') as FormArray;
    this.updatePrimitiveArray(titlesArray, person?.titles || []);

    const alternativeNamesArray = form.get('alternativeNames') as FormArray;
    this.updatePrimitiveArray(alternativeNamesArray, person?.alternativeNames || []);

    const pseudonymsArray = form.get('pseudonyms') as FormArray;
    this.updatePrimitiveArray(pseudonymsArray, person?.pseudonyms || []);

    this.updateIdentifier_FG(form.get('identifier') as FormGroup<ControlType<IdentifierVO>>, person?.identifier || null);

    const organizationsArray = form.get('organizations') as FormArray;
    this.updateFormArray(organizationsArray, person?.organizations || [], (ou, fg) =>
      fg ? (this.updateOrganization_FG(fg as FormGroup<ControlType<OrganizationVO>>, ou), fg) : this.organization_FG(ou)
    );

    form.patchValue({
      givenName: person?.givenName || undefined,
      familyName: person?.familyName || undefined,
      completeName: person?.completeName || undefined,
      orcid: person?.orcid || undefined,
    });
  }

  /**
   * Update an existing identifier FormGroup with new data
   */
  updateIdentifier_FG(form: FormGroup<ControlType<IdentifierVO>>, identifier: IdentifierVO | null): FormGroup<ControlType<IdentifierVO>> {
    form.patchValue({
      id: identifier?.id || undefined,
      type: identifier?.type || undefined,
    });
    return form;
  }

  /**
   * Update an existing metadata FormGroup with new data
   */
  updateMetadata_FG(form: FormGroup<ControlType<MdsPublicationVO>>, metadata: MdsPublicationVO | null): void {
    this.updateEvent_FG(form.get('event') as FormGroup<ControlType<EventVO>>, metadata?.event || null);
    this.updateLegalCase_FG(form.get('legalCase') as FormGroup<ControlType<LegalCaseVO>>, metadata?.legalCase || null);
    this.updatePublishingInfo_FG(form.get('publishingInfo') as FormGroup<ControlType<PublishingInfoVO>>, metadata?.publishingInfo || null);

    const altTitlesArray = form.get('alternativeTitles') as FormArray;
    this.updateFormArray(altTitlesArray, metadata?.alternativeTitles || [], (at, fg) =>
      fg ? this.updateAltTitle_FG(fg as FormGroup<ControlType<AlternativeTitleVO>>, at) : this.alt_title_FG(at)
    );

    const creatorsArray = form.get('creators') as FormArray;
    this.updateFormArray(creatorsArray, metadata?.creators || [], (creator, fg) =>
      fg ? this.updateCreator_FG(fg as FormGroup<ControlType<CreatorVO>>, creator) : this.creator_FG(creator)
    );

    const identifiersArray = form.get('identifiers') as FormArray;
    this.updateFormArray(identifiersArray, metadata?.identifiers || [], (id, fg) =>
      fg ? this.updateIdentifier_FG(fg as FormGroup<ControlType<IdentifierVO>>, id) : this.identifier_FG(id)
    );

    const languagesArray = form.get('languages') as FormArray;
    this.updatePrimitiveArray(languagesArray, metadata?.languages || []);

    const sourcesArray = form.get('sources') as FormArray;
    this.updateFormArray(sourcesArray, metadata?.sources || [], (s, fg) =>
      fg ? this.updateSource_FG(fg as FormGroup<ControlType<SourceVO>>, s) : this.source_FG(s)
    );

    const subjectsArray = form.get('subjects') as FormArray;
    this.updateFormArray(subjectsArray, metadata?.subjects || [], (s, fg) =>
      fg ? this.updateSubject_FG(fg as FormGroup<ControlType<SubjectVO>>, s) : this.subject_FG(s)
    );

    const abstractsArray = form.get('abstracts') as FormArray;
    this.updateFormArray(abstractsArray, metadata?.abstracts || [], (a, fg) =>
      fg ? this.updateAbstract_FG(fg as FormGroup<ControlType<AbstractVO>>, a) : this.abstract_FG(a)
    );

    const projectInfoArray = form.get('projectInfo') as FormArray;
    this.updateFormArray(projectInfoArray, metadata?.projectInfo || [], (pi, fg) =>
      fg ? this.updateProjectInfo_FG(fg as FormGroup<ControlType<ProjectInfoVO>>, pi) : this.project_info_FG(pi)
    );

    form.patchValue({
      title: metadata?.title || undefined,
      dateAccepted: metadata?.dateAccepted || undefined,
      dateCreated: metadata?.dateCreated || undefined,
      dateModified: metadata?.dateModified || undefined,
      datePublishedInPrint: metadata?.datePublishedInPrint || undefined,
      datePublishedOnline: metadata?.datePublishedOnline || undefined,
      dateSubmitted: metadata?.dateSubmitted || undefined,
      degree: metadata?.degree || undefined,
      duration: metadata?.duration || undefined,
      genre: metadata?.genre || MdsPublicationGenre.ARTICLE,
      location: metadata?.location || undefined,
      reviewMethod: metadata?.reviewMethod || undefined,
      freeKeywords: metadata?.freeKeywords || undefined,
      tableOfContents: metadata?.tableOfContents || undefined,
      totalNumberOfPages: metadata?.totalNumberOfPages || undefined,
    });
  }

  /**
   * Update an existing source FormGroup with new data
   */
  updateSource_FG(form: FormGroup<ControlType<SourceVO>>, source: SourceVO | null): FormGroup<ControlType<SourceVO>> {
    const altTitlesArray = form.get('alternativeTitles') as FormArray;
    this.updateFormArray(altTitlesArray, source?.alternativeTitles || [], (at, fg) =>
      fg ? this.updateAltTitle_FG(fg as FormGroup<ControlType<AlternativeTitleVO>>, at) : this.alt_title_FG(at)
    );

    const creatorsArray = form.get('creators') as FormArray;
    this.updateFormArray(creatorsArray, source?.creators || [], (c, fg) =>
      fg ? this.updateCreator_FG(fg as FormGroup<ControlType<CreatorVO>>, c) : this.creator_FG(c)
    );

    this.updatePublishingInfo_FG(form.get('publishingInfo') as FormGroup<ControlType<PublishingInfoVO>>, source?.publishingInfo || null);

    const identifiersArray = form.get('identifiers') as FormArray;
    this.updateFormArray(identifiersArray, source?.identifiers || [], (i, fg) =>
      fg ? this.updateIdentifier_FG(fg as FormGroup<ControlType<IdentifierVO>>, i) : this.identifier_FG(i)
    );

    form.patchValue({
      title: source?.title || undefined,
      volume: source?.volume || undefined,
      issue: source?.issue || undefined,
      startPage: source?.startPage || undefined,
      endPage: source?.endPage || undefined,
      sequenceNumber: source?.sequenceNumber || undefined,
      genre: source?.genre || undefined,
      totalNumberOfPages: source?.totalNumberOfPages || undefined,
    });

    return form;
  }

  /**
   * Update an existing event FormGroup with new data
   */
  updateEvent_FG(form: FormGroup<ControlType<EventVO>>, event: EventVO | null): void {
    form.patchValue({
      endDate: event?.endDate || undefined,
      invitationStatus: event?.invitationStatus || undefined,
      place: event?.place || undefined,
      startDate: event?.startDate || undefined,
      title: event?.title || undefined,
    });
  }

  /**
   * Update an existing legal case FormGroup with new data
   */
  updateLegalCase_FG(form: FormGroup<ControlType<LegalCaseVO>>, legalCase: LegalCaseVO | null): void {
    form.patchValue({
      courtName: legalCase?.courtName || undefined,
      title: legalCase?.title || undefined,
      identifier: legalCase?.identifier || undefined,
      datePublished: legalCase?.datePublished || undefined,
    });
  }

  /**
   * Update an existing publishing info FormGroup with new data
   */
  updatePublishingInfo_FG(form: FormGroup<ControlType<PublishingInfoVO>>, info: PublishingInfoVO | null): void {
    form.patchValue({
      edition: info?.edition || undefined,
      place: info?.place || undefined,
      publisher: info?.publisher || undefined,
    });
  }

  /**
   * Update an existing subject FormGroup with new data
   */
  updateSubject_FG(form: FormGroup<ControlType<SubjectVO>>, subject: SubjectVO | null): FormGroup<ControlType<SubjectVO>> {
    form.patchValue({
      language: subject?.language || undefined,
      value: subject?.value || undefined,
      type: subject?.type || undefined,
    });
    return form;
  }

  /**
   * Update an existing abstract FormGroup with new data
   */
  updateAbstract_FG(form: FormGroup<ControlType<AbstractVO>>, abstract: AbstractVO | null): FormGroup<ControlType<AbstractVO>> {
    form.patchValue({
      language: abstract?.language || undefined,
      value: abstract?.value || undefined,
    });
    return form;
  }

  /**
   * Update an existing project info FormGroup with new data
   */
  updateProjectInfo_FG(form: FormGroup<ControlType<ProjectInfoVO>>, pi: ProjectInfoVO | null): FormGroup<ControlType<ProjectInfoVO>> {
    this.updateFundingInfo_FG(form.get('fundingInfo') as FormGroup<ControlType<FundingInfoVO>>, pi?.fundingInfo || null);
    this.updateIdentifier_FG(form.get('grantIdentifier') as FormGroup<ControlType<IdentifierVO>>, pi?.grantIdentifier || null);

    form.patchValue({
      title: pi?.title || undefined,
    });

    return form;
  }

  /**
   * Update an existing funding info FormGroup with new data
   */
  updateFundingInfo_FG(form: FormGroup<ControlType<FundingInfoVO>>, fi: FundingInfoVO | null): void {
    this.updateFundingOrg_FG(form.get('fundingOrganization') as FormGroup<ControlType<FundingOrganizationVO>>, fi?.fundingOrganization || null);
    this.updateFundingProg_FG(form.get('fundingProgram') as FormGroup<ControlType<FundingProgramVO>>, fi?.fundingProgram || null);
  }

  /**
   * Update an existing funding organization FormGroup with new data
   */
  updateFundingOrg_FG(form: FormGroup<ControlType<FundingOrganizationVO>>, fo: FundingOrganizationVO | null): void {
    const identifiersArray = form.get('identifiers') as FormArray;
    this.updateFormArray(identifiersArray, fo?.identifiers || [], (i, fg) =>
      fg ? this.updateIdentifier_FG(fg as FormGroup<ControlType<IdentifierVO>>, i) : this.identifier_FG(i, false)
    );

    form.patchValue({
      title: fo?.title || undefined,
    });
  }

  /**
   * Update an existing funding program FormGroup with new data
   */
  updateFundingProg_FG(form: FormGroup<ControlType<FundingProgramVO>>, fp: FundingProgramVO | null): void {
    const identifiersArray = form.get('identifiers') as FormArray;
    this.updateFormArray(identifiersArray, fp?.identifiers || [], (i, fg) =>
      fg ? this.updateIdentifier_FG(fg as FormGroup<ControlType<IdentifierVO>>, i) : this.identifier_FG(i, false)
    );

    form.patchValue({
      title: fp?.title || undefined,
    });
  }
}
