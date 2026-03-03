import {inject, Inject, Injectable} from '@angular/core';
import {SearchCriterion} from "./criterions/SearchCriterion";
import {Parenthesis, PARENTHESIS_TYPE} from "./criterions/operators/Parenthesis";
import {forkJoin, map, tap} from "rxjs";
import {LogicalOperator} from "./criterions/operators/LogicalOperator";
import {FormArray, FormBuilder, FormGroup} from "@angular/forms";
import {SavedSearchesModalComponent} from "../shared/saved-searches-modal/saved-searches-modal.component";
import {ItemVersionState} from "../../model/inge";
import {DisplayType, searchTypes} from "./criterions/search_config";
import {TitleSearchCriterion} from "./criterions/StandardSearchCriterion";
import {OrganizationSearchCriterion, PersonSearchCriterion} from "./criterions/StringOrHiddenIdSearchCriterion";
import {DATE_SEARCH_TYPES, DateSearchCriterion} from "./criterions/DateSearchCriterion";
import {ContextListSearchCriterion} from "./criterions/ContextListSearchCriterion";
import {ItemStateListSearchCriterion} from "./criterions/ItemStateListSearchCriterion";
import {GenreListSearchCriterion} from "./criterions/GenreListSearchCriterion";
import {PublicationStateSearchCriterion} from "./criterions/PublicationStateSearchCriterion";
import {COMPONENT_SEARCH_TYPES, FileSectionSearchCriterion} from "./criterions/FileSectionSearchCriterion";
import {ContextsService} from "../../services/pubman-rest-client/contexts.service";
import {OrganizationsService} from "../../services/pubman-rest-client/organizations.service";
import {AaService} from "../../services/aa.service";

@Injectable({
  providedIn: 'root',
})
export class ItemSearchAdvancedService {

  private fb = inject(FormBuilder);
  private contextsService = inject(ContextsService);
  private ouService = inject(OrganizationsService);
  private aaService = inject(AaService);
  servicesForCriterions: any;

  constructor() {
    this.servicesForCriterions = {
      contextsService: this.contextsService,
      ouService: this.ouService,
      aaService: this.aaService,
    }
  }


  private scListToElasticSearchQuery(scList: SearchCriterion[]) {
    const cleanedScList = this.removeEmptyFields(scList);

    //console.log("Cleaned List " + cleanedScList);

    // Set partner parenthesis for every parenthesis
    let parenthesisStack: Parenthesis[] = [];
    for (let sc of cleanedScList) {
      if (PARENTHESIS_TYPE.OPENING_PARENTHESIS === (sc.type)) {
        parenthesisStack.push(sc as Parenthesis);

      } else if (PARENTHESIS_TYPE.CLOSING_PARENTHESIS === (sc.type)) {

        const closingParenthesis = sc as Parenthesis;
        const openingParenthesis = parenthesisStack.pop();

        closingParenthesis.partnerParenthesis = openingParenthesis;
        openingParenthesis!.partnerParenthesis = closingParenthesis;
      }
    }
    //Join all subquery-creations
    return forkJoin(cleanedScList.map(sc => {
      const query = sc.toElasticSearchQuery();
      //console.log("Calling " + sc.type + query);
      return query;
    }))

      //Set query in every search criterion object
      .pipe(
        tap(queries => cleanedScList.forEach((sc, i) => {
          //console.log("Transforming list to queries " + sc.type + " -- " + JSON.stringify(queries[i]));
          sc.query = queries[i];
        })),
        //when everything is ready, create complete query
        map(data => {
            return this.cleanedScListToElasticSearchQuery(cleanedScList, data, undefined)
          }
        )
      )

  }

  private cleanedScListToElasticSearchQuery(scList: SearchCriterion[], queries: (Object | undefined)[], parentNestedPath: string | undefined): Object | undefined {

    //SearchCriterionBase.logger.debug("Call with list: " + scList);

    //console.log("Transforming list to queries " + queries)
    if (scList.length == 0) {
      return {match_all: {}};
    }

    let resultedQueryBuilder: Object | undefined = {};

    let parenthesisOpened = 0;

    let mainOperators: LogicalOperator[] = [];
    let lastOperator: LogicalOperator | undefined;
    let mixedOrAndAnd: boolean = false;
    let sharedNestedField: string | undefined = "";
    let criterionList = [...scList];

    //SearchCriterionBase.logger.debug("List: " + criterionList);

    // Remove unnecessary parenthesis
    while (PARENTHESIS_TYPE.OPENING_PARENTHESIS === (criterionList[0].type)
    && PARENTHESIS_TYPE.CLOSING_PARENTHESIS === (criterionList[criterionList.length - 1].type)
    && (criterionList[0] as Parenthesis).partnerParenthesis === (criterionList[criterionList.length - 1] as Parenthesis)) {

      criterionList.splice(0, 1);
      criterionList.splice(criterionList.length - 1, 1);
    }

    //SearchCriterionBase.logger.debug("List after removal: " + criterionList);

    for (let sc of criterionList) {

      if (searchTypes[sc.type] && DisplayType.OPERATOR === (searchTypes[sc.type].displayType)) {

        if (parenthesisOpened == 0) {

          const op: LogicalOperator = sc as LogicalOperator;
          mainOperators.push(op);
          //Check if this operator changes from last
          if (lastOperator && ((lastOperator.type === "or" && op.type !== "or")
            || (lastOperator.type !== "or" && op.type === "or")

          )) {
            mixedOrAndAnd = true;
          }
          lastOperator = op;
        }

      } else if (PARENTHESIS_TYPE.OPENING_PARENTHESIS === sc.type) {
        parenthesisOpened++;

      } else if (PARENTHESIS_TYPE.CLOSING_PARENTHESIS === sc.type) {
        parenthesisOpened--;

      } else {

        // if all criterias have the same nested field and if it's different from the parent
        // nested
        // criteria, set a new nested query
        if ((sharedNestedField && sharedNestedField.length === 0
            && !(parentNestedPath && sc.getElasticSearchNestedPath() === parentNestedPath))
          || (!sc.getElasticSearchNestedPath() && sc.getElasticSearchNestedPath() === sharedNestedField
            && sc.getElasticSearchNestedPath() !== parentNestedPath)) {
          sharedNestedField = sc.getElasticSearchNestedPath();
        } else {
          sharedNestedField = undefined;
        }
      }
    }

    if (sharedNestedField) {
      //SearchCriterionBase.logger.debug("Found common nested field: " + sharedNestedField);
    }

    if (criterionList.length == 1) {
      resultedQueryBuilder = criterionList[0].query;

    } else if (mainOperators.length > 0) {

      //SearchCriterionBase.logger.debug("found main operators: " + mainOperators);

      //console.log("found main operators: " + mainOperators);
      let should = [];
      let must = [];
      let mustNot = [];

      // If there are AND/NOTAND operators mixed with OR operators, divide by OR operators ->
      // Remove all AND / NOTAND operators
      if (mixedOrAndAnd) {
        mainOperators = mainOperators.filter(op => op.type === "or");
        //mainOperators.removeIf(item -> !SearchCriterion.OR_OPERATOR.equals(item.getSearchCriterion()));
      }

      for (let i = 0; i < mainOperators.length; i++) {
        const op: LogicalOperator = mainOperators[i];
        const indexOfOperator = criterionList.indexOf(op);
        const nextIndexOfOperator =
          (mainOperators.length > i + 1) ? criterionList.indexOf(mainOperators[i + 1]) : criterionList.length;

        if (i == 0) {
          const leftList = criterionList.slice(0, indexOfOperator);

          if ("or" === (op.type)) {
            should.push(this.cleanedScListToElasticSearchQuery(leftList, queries, sharedNestedField));
          } else if ("and" === (op.type)) {
            must.push(this.cleanedScListToElasticSearchQuery(leftList, queries, sharedNestedField));
          } else if ("not" === (op.type)) {
            must.push(this.cleanedScListToElasticSearchQuery(leftList, queries, sharedNestedField));
            //TODO Check if "must" is correct here
          }
        }

        const rightList = criterionList.slice(indexOfOperator + 1, nextIndexOfOperator);

        if ("or" === (op.type)) {
          should.push(this.cleanedScListToElasticSearchQuery(rightList, queries, sharedNestedField));
        } else if ("and" === (op.type)) {
          must.push(this.cleanedScListToElasticSearchQuery(rightList, queries, sharedNestedField));
        } else if ("not" === (op.type)) {
          mustNot.push(this.cleanedScListToElasticSearchQuery(rightList, queries, sharedNestedField));
        }
      }

      resultedQueryBuilder =
        {
          bool: {
            ...should.length > 0 && {should: should},
            ...must.length > 0 && {must: must},
            ...mustNot.length > 0 && {must_not: mustNot},
          }
        }
    }

    return resultedQueryBuilder;

  }

  public removeEmptyFields(criterionList: SearchCriterion[]): SearchCriterion[] {
    if (!criterionList) {
      return [];


    } else {


      let copyForRemoval = [...criterionList];
      let copyForIteration = [...criterionList];
      // Collections.copy(copy, criterionList);

      for (let sc of copyForIteration) {
        if (sc.isEmpty()) {
          this.removeSearchCriterionWithOperator(copyForRemoval, sc);
          //console.log("Removing " + sc.type);
        }
      }

      // if first in list is an operator except "NOT", remove it
      if (copyForRemoval.length > 0 && (copyForRemoval[0].type === "and" || copyForRemoval[0].type === "or")) {
        copyForRemoval.splice(0, 1);
      }
      return copyForRemoval;
    }
  }


  public removeSearchCriterionWithOperator(criterionList: SearchCriterion[], criterion: SearchCriterion) {

    const position = criterionList.indexOf(criterion);
    // try to delete
    let deleteBefore = true;
    if (position == 0) {
      deleteBefore = false;
    } else if (position - 1 >= 0) {
      let scBefore = criterionList[position - 1];


      deleteBefore = scBefore.type !== (PARENTHESIS_TYPE.OPENING_PARENTHESIS);

      if (!deleteBefore && position + 1 < criterionList.length) {
        let scAfter = criterionList[position + 1];
        deleteBefore = scAfter.type === (PARENTHESIS_TYPE.CLOSING_PARENTHESIS);
      }
    }


    if (deleteBefore) {
      for (let i = position; i >= 0; i--) {
        const sci = criterionList[i];
        if (searchTypes[sci.type] && DisplayType.OPERATOR === (searchTypes[sci.type].displayType)) {
          criterionList.splice(position, 1);
          criterionList.splice(i, 1);
          break;

        }
      }
    } else {
      // delete logical operator after
      for (let i = position; i < criterionList.length; i++) {
        const sci = criterionList[i];
        if (searchTypes[sci.type] && DisplayType.OPERATOR === (searchTypes[sci.type].displayType)) {
          criterionList.splice(i, 1);
          criterionList.splice(position, 1);
          break;

        }
      }
    }

    // if none was found, just remove the criteria itself
    if (criterionList.includes(criterion))
      criterionList.splice(criterionList.indexOf(criterion), 1);


    let parenthesisToRemove: SearchCriterion[] = [];
    // now remove empty parenthesis
    for (let i = 0; i < criterionList.length; i++) {
      let sc = criterionList[i];
      if (PARENTHESIS_TYPE.OPENING_PARENTHESIS === (sc.type)) {
        if (i + 1 < criterionList.length) {
          let next = criterionList[i + 1];
          if (PARENTHESIS_TYPE.CLOSING_PARENTHESIS === (next.type)) {
            parenthesisToRemove.push(sc);
            parenthesisToRemove.push(next);
          }
        }

      }
    }

    parenthesisToRemove.forEach(parenthesis => {
      if (criterionList.includes(parenthesis)) criterionList.splice(criterionList.indexOf(parenthesis), 1);
    });

    // if first criterion is an operand, remove it
    if (criterionList != null && criterionList.length > 0 &&
      searchTypes[criterionList[0].type] && DisplayType.OPERATOR == (searchTypes[criterionList[0].type].displayType)) {
      criterionList.splice(0, 1);
    }


  }

  private prepareQuery(searchForm: FormGroup) {
    const searchCriterions = (searchForm.get("flexibleFields") as FormArray).controls.map(fc => fc as SearchCriterion);
    Object.keys(searchForm.controls).forEach((key) => {
      const control = searchForm.get(key);
      if (key !== "flexibleFields") {
        searchCriterions.push(new LogicalOperator("and"));
        searchCriterions.push(new Parenthesis(PARENTHESIS_TYPE.OPENING_PARENTHESIS));
        searchCriterions.push(control as SearchCriterion);
        searchCriterions.push(new Parenthesis(PARENTHESIS_TYPE.CLOSING_PARENTHESIS));
      }
    });
    return searchCriterions
  }

  getElasticsearchQuery(searchForm: FormGroup) {
    return this.scListToElasticSearchQuery(this.prepareQuery(searchForm));
  }

  getElasticsearchQueryFromFormJson(formJson: any) {
    return this.getElasticsearchQuery(this.initSearchFormFromJson(formJson));
  }

  initSearchForm(admin:boolean) {
    const contextListSearchCriterion = new ContextListSearchCriterion(admin, this.servicesForCriterions);
    const itemStateListSearchCriterion = new ItemStateListSearchCriterion(this.servicesForCriterions);
    const genreListSearchCriterion = new GenreListSearchCriterion(this.servicesForCriterions);
    const publicationStateSearchCriterion = new PublicationStateSearchCriterion(this.servicesForCriterions);
    const fileSectionSearchCriterion = new FileSectionSearchCriterion(COMPONENT_SEARCH_TYPES.FILES, this.servicesForCriterions);
    const locatorSectionSearchCriterion = new FileSectionSearchCriterion(COMPONENT_SEARCH_TYPES.LOCATORS, this.servicesForCriterions);


    const searchForm = this.fb.group({

      flexibleFields: this.fb.array([
        new TitleSearchCriterion(this.servicesForCriterions),
        new LogicalOperator("and"),
        new PersonSearchCriterion(this.servicesForCriterions),
        new LogicalOperator("and"),
        new OrganizationSearchCriterion(this.servicesForCriterions),
        new LogicalOperator("and"),
        new DateSearchCriterion(DATE_SEARCH_TYPES.ANYDATE, this.servicesForCriterions),
      ]),
      contexts: contextListSearchCriterion,
      itemStates: itemStateListSearchCriterion,
      genres: genreListSearchCriterion,
      publicationState: publicationStateSearchCriterion,
      files: fileSectionSearchCriterion,
      locators: locatorSectionSearchCriterion
    });

    return searchForm;
  }

  initSearchFormFromJson(formJson: any) {
    //Reset all
    const searchForm = this.initSearchForm(false);
    const flexibleFields = searchForm.get("flexibleFields") as FormArray;

    for (let [key, value] of Object.entries(formJson)) {

      if (key === "flexibleFields") {
        //Clear old fields
        flexibleFields.clear();
        //Recreate flexible search criterions and patch form values
        for (let currentField of (value as any[])) {
          const newSearchCriterion: SearchCriterion = new searchTypes[currentField.type].handlerClass(currentField.type, this.servicesForCriterions);
          newSearchCriterion.patchValue(currentField);
          flexibleFields.push(newSearchCriterion);
        }
      } else {
        //Just patch the values for genre list, file section etc.
        searchForm.patchValue({[key]: value});
      }
    }
    return searchForm;
  }



}
