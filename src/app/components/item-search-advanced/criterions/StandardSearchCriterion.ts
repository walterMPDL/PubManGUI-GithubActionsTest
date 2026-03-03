import { SearchCriterion } from "./SearchCriterion";
import { FormControl } from "@angular/forms";
import {baseElasticSearchQueryBuilder, IndexField} from "../../../utils/search-utils";
import { Observable, of } from "rxjs";
import { ContextDbVO, SubjectClassification } from "../../../model/inge";
import { ContextsService } from "../../../services/pubman-rest-client/contexts.service";


export abstract class StandardSearchCriterion extends SearchCriterion {

  protected constructor(type: string, opts?:any) {
    super(type, opts);
    this.content.addControl("text", new FormControl(''));
  }

  getElasticIndexes(): IndexField[] {
    return [];
  }

  override getElasticSearchNestedPath(): string | undefined {
    return "";
  }

  override isEmpty(): boolean {
    const searchString = this.content.get('text')?.value;
    return searchString == null || searchString.trim().length===0;
  }

  override toElasticSearchQuery(): Observable<Object | undefined> {
    return of(baseElasticSearchQueryBuilder(this.getElasticIndexes(), this.content.get('text')?.value));
  }

  getFormContent(): string {
    return this.content.get('text')?.value;
  }

}

export class TitleSearchCriterion extends StandardSearchCriterion {
  constructor(type?: string, opts?:any) {
    super("title", opts);
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "metadata.title", type:"text"}, {index: "metadata.alternativeTitles.value", type:"text"}];
  }

}

export class KeywordSearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("keyword", opts);
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "metadata.freeKeywords", type: "text"}];
  }

}

export class ClassificationSearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("classification", opts);
    this.content.addControl("classificationType", new FormControl(SubjectClassification.DDC.valueOf()));
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "metadata.subjects.value", type: "text"}];
  }

  override getElasticSearchNestedPath(): string | undefined {
    return "metadata.subjects";
  }

  override toElasticSearchQuery(): Observable<Object | undefined> {
    const q =  {
      nested: {
        path: this.getElasticSearchNestedPath(),
        query: {
          bool: {
            must: [
              baseElasticSearchQueryBuilder({index: "metadata.subjects.type", type:"keyword"}, this.content.get('classificationType')?.value),
              baseElasticSearchQueryBuilder(this.getElasticIndexes(), this.content.get('text')?.value)
            ]
          }
        }
      }
    };
    console.log(q)
    return of(q);

  }

}

export class IdentifierSearchCriterion extends StandardSearchCriterion {


  constructor(type?: string, opts?:any) {
    super("identifier", opts);
    this.content.addControl("identifierType", new FormControl(''));
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "objectId", type: "keyword"},{index: "objectPid.keyword", type: "keyword"},{index: "versionPid.keyword", type: "keyword"},{index: "metadata.identifiers.id", type: "text"},{index: "metadata.sources.identifiers.id", type: "text"}];
  }


  override toElasticSearchQuery(): Observable<Object | undefined> {
    if(!this.content.get("identifierType")?.value) {
      return super.toElasticSearchQuery();
    }
    else
    {

      return of({
        bool: {
          should: [{
            nested: {
              path: "metadata.identifiers",
              query: {
                bool: {
                  must: [
                    baseElasticSearchQueryBuilder({index: "metadata.identifiers.type", type: "keyword"}, this.content.get('identifierType')?.value),
                    baseElasticSearchQueryBuilder({index: "metadata.identifiers.id", type: "text"}, this.getFormContent())
                  ]
                }
              }
            }
          },
            {
              nested: {
                path: "metadata.sources.identifiers",
                query: {
                  bool: {
                    must: [
                      baseElasticSearchQueryBuilder({index: "metadata.sources.identifiers.type", type: "keyword"}, this.content.get('identifierType')?.value),
                      baseElasticSearchQueryBuilder({index: "metadata.sources.identifiers.id", type: "text"}, this.getFormContent())
                    ]
                  }
                }
              }
            }
          ]
        }
      })
    }

  }

}

export class CollectionSearchCriterion extends StandardSearchCriterion {

  contextList: ContextDbVO[] = [];

  private contextsService: ContextsService;

  constructor(type?: string, opts?:any) {
    super("collection", opts);
    this.contextsService = opts.contextsService;



    //Retrieve all contexts and sort them by their name
    this.contextsService.list(undefined, 1000, 0)
      .subscribe( result => this.contextList = result.records
        .map(res => res.data)
        .sort((c1, c2) => c1.name!.localeCompare(c2.name!))
      );
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "context.objectId", type: "keyword"}];
  }

}

export class AnyFieldSearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("anyField", opts);
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "_all", type: "text"}];
  }

  override toElasticSearchQuery(): Observable<Object | undefined> {
    return of({simple_query_string: {query: this.getFormContent(), default_operator: "and", analyze_wildcard: true}})
    //return baseElasticSearchQueryBuilder(this.getElasticIndexes(), this.content.get('text')?.value);
  }
}

export class FulltextSearchCriterion extends StandardSearchCriterion {

  constructor(type?:string, opts?:any) {
    super(type ? type : "fulltext", opts);
  }

  override toElasticSearchQuery(): Observable<Object | undefined> {

    return of({
      has_child : {
        type : "file",
        query: baseElasticSearchQueryBuilder({index: "fileData.attachment.content", type:"text"}, this.getFormContent()),
        score_mode: "avg",
        inner_hits: {
          highlight: {
            fields: {"fileData.attachment.content": {}},
            pre_tags: ["<span class=\"bg-success-subtle\">"],
            post_tags: ["</span>"]
          },
          _source: {
            excludes: ["fileData.attachment.content"]
          }
        },
      }
    })


    //return {simple_query_string: {query: this.content.get('text')?.value, default_operator: "and", analyze_wildcard: true}}
    //return baseElasticSearchQueryBuilder(this.getElasticIndexes(), this.content.get('text')?.value);
  }
}

export class AnyFieldAndFulltextSearchCriterion extends FulltextSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("anyFieldAndFulltext", opts);
  }

  override toElasticSearchQuery(): Observable<Object | undefined> {
    return of({
      bool: {
        should : [
          {simple_query_string: {query: this.getFormContent(), default_operator: "and", analyze_wildcard: true}},
          super.toElasticSearchQuery()

        ]

      }
    })
    //return baseElasticSearchQueryBuilder(this.getElasticIndexes(), this.content.get('text')?.value);
  }
}

export class ComponentContentCategorySearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("componentContentCategory", opts);
  }

  override getElasticIndexes(): IndexField[] {

    return [{index: "metadata.files.contentCategory.keyword", type: "keyword"}];
  }

  override getElasticSearchNestedPath(): string | undefined {
    return "metadata.files";
  }



}

export class ComponentVisibilitySearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("componentVisibility",opts);
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "metadata.files.visibility", type:"keyword"}];
  }

  override getElasticSearchNestedPath(): string | undefined {
    return "metadata.files";
  }
}

export class DegreeSearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("degree", opts);
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "metadata.degree", type:"keyword"}];
  }
}

export class EventTitleSearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("eventTitle", opts);
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "metadata.event.title", type:"text"}];
  }
}

export class JournalSearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("journal", opts);
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "metadata.sources.title", type:"text"}, {index: "metadata.sources.alternativeTitles.value", type:"text"}];
  }

  override getElasticSearchNestedPath(): string | undefined {
    return "metadata.sources";
  }

  handleJournalSuggest(item: any) {
    const title = item?.value?.substring(0, item.value.lastIndexOf(";"));
    if(title) {
      this.content.get("text")?.setValue('"' + title + '"');
    }

  }
}

export class LanguageSearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("language", opts);
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "metadata.languages", type:"keyword"}];
  }
}

export class LocalTagSearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("localTag", opts);
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "localTags", type:"text"}];
  }
}

export class OrcidSearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("orcid", opts);
  }

  override getElasticIndexes(): IndexField[] {

    return [{index: "metadata.creators.person.orcid", type: "text"}, {index: "metadata.sources.creators.person.orcid", type: "text"}];
  }
}

export class ProjectInfoSearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("projectInfo", opts);
  }

  override getElasticIndexes(): IndexField[] {

    return [{index: "metadata.projectInfo.title", type:"text"}, {index: "metadata.projectInfo.grantIdentifier.id", type:"keyword"},
      {index: "metadata.projectInfo.fundingInfo.fundingProgram.title", type:"text"}, {index: "metadata.projectInfo.fundingInfo.fundingProgram.identifiers.id", type:"keyword"},
      {index: "metadata.projectInfo.fundingInfo.fundingOrganization.title", type:"text"}, {index: "metadata.projectInfo.fundingInfo.fundingOrganization.identifiers.id", type:"keyword"}];
  }
}

export class SourceSearchCriterion extends StandardSearchCriterion {

  constructor(type?: string, opts?:any) {
    super("source", opts);
  }

  override getElasticIndexes(): IndexField[] {
    return [{index: "metadata.sources.title", type:"text"}, {index: "metadata.sources.alternativeTitles.value", type:"text"}];
  }

  override getElasticSearchNestedPath(): string | undefined {
    return "metadata.sources";
  }

}


