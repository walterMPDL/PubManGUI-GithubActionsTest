import { SearchCriterion } from "./SearchCriterion";
import { Observable, of } from "rxjs";
import { FormControl, FormGroup } from "@angular/forms";
import { ItemVersionState } from "../../../model/inge";
import { baseElasticSearchQueryBuilder } from "../../../utils/search-utils";
import { AaService } from "../../../services/aa.service";

export class ItemStateListSearchCriterion extends SearchCriterion {


  itemStateOptions = Object.keys(ItemVersionState);

  aaService:AaService;

  constructor(opts?:any) {
    super("itemStateList", opts);
    this.content.addControl("publicationStates", new FormGroup({}));
    this.itemStateOptions.forEach(itemState => this.publicationStatesFormGroup.addControl(itemState, new FormControl(false)));

    this.aaService = opts.aaService;
    this.aaService.principal.subscribe(p => {
      if(p.loggedIn) {
        this.publicationStatesFormGroup.get(ItemVersionState.PENDING.valueOf())?.setValue(true);
        this.publicationStatesFormGroup.get(ItemVersionState.SUBMITTED.valueOf())?.setValue(true);
        this.publicationStatesFormGroup.get(ItemVersionState.RELEASED.valueOf())?.setValue(true);
        this.publicationStatesFormGroup.get(ItemVersionState.IN_REVISION.valueOf())?.setValue(true);
      }
      else {
        this.itemStateOptions.forEach(itemState => this.publicationStatesFormGroup.get(itemState)?.setValue(false));
      }
    })

  }

  /**
   * Always return false, as we need to filter out withdrawn and duplicates
   */
  override isEmpty(): boolean {
    /*
    const isEmpty = !Object.keys(this.publicationStatesFormGroup.controls).some(pubState => this.publicationStatesFormGroup.get(pubState)?.value);
    return isEmpty;
    */

    return false;
  }

  override toElasticSearchQuery(): Observable<Object | undefined> {



    const selectedStates = Object.keys(this.publicationStatesFormGroup.controls)
      .filter(genre => this.publicationStatesFormGroup.get(genre)?.value);


    //if no states are selected, filter withdrawn items and duplicate versions
    if(selectedStates.length === 0) {
      const filterOutQuery = this.aaService.filterOutQuery([ItemVersionState.PENDING, ItemVersionState.SUBMITTED, ItemVersionState.IN_REVISION]);
      return of(
        {
        bool: {
          must_not: [
            baseElasticSearchQueryBuilder({index: "publicState", type: "keyword"}, "WITHDRAWN"),
            ...(filterOutQuery ? [filterOutQuery] : [])
          ]

          }
        }
      )
    }

    let shouldClauses: Object[] = [];
    let mustNotClauses: any[] = [];

      selectedStates.forEach(pubState => {
      switch (pubState) {
        case "RELEASED" : {
          shouldClauses.push({
            bool: {
              must: [baseElasticSearchQueryBuilder({index: "versionState", type: "keyword"}, pubState)],
              must_not:[baseElasticSearchQueryBuilder({index: "publicState", type: "keyword"}, "WITHDRAWN")],
            }
          });

          break;
        }
        case "SUBMITTED" :
        case "PENDING" :
        case "IN_REVISION" : {
          shouldClauses.push({
            bool: {
              must: [baseElasticSearchQueryBuilder({index: "versionState", type: "keyword"}, pubState)],
              must_not:[
                baseElasticSearchQueryBuilder({index: "publicState", type: "keyword"}, "WITHDRAWN")
              ],
            }
          });
          const filterOutQuery = this.aaService.filterOutQuery([pubState])
          if(filterOutQuery) {
            mustNotClauses.push(this.aaService.filterOutQuery([pubState]));
          }

          break;
        }
        case "WITHDRAWN" : {
          shouldClauses.push({
            bool: {
              must:[baseElasticSearchQueryBuilder({index: "publicState", type: "keyword"}, pubState)],
            }
          });
          break;
        }
      }
    });

    return of({
      bool: {
        should: shouldClauses,
        ...mustNotClauses.length > 0 && {must_not: mustNotClauses}
      }
    })


  }


  getElasticSearchNestedPath(): string | undefined {
    return undefined;
  }

  get publicationStatesFormGroup() {
    return this.content.get("publicationStates") as FormGroup;
  }



}
