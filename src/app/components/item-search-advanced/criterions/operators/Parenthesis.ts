import { SearchCriterion } from "../SearchCriterion";
import { Observable, of } from "rxjs";

export enum PARENTHESIS_TYPE {
  OPENING_PARENTHESIS="opening_parenthesis",
  CLOSING_PARENTHESIS="closing_parenthesis",
}

export class Parenthesis extends SearchCriterion{



  partnerParenthesis : Parenthesis | undefined;

  constructor(type: string, opts?:any) {
    super(type, opts);
    this.removeControl("content");
    /*
    this.content.addControl(
      "parenthesis" , new FormControl(type)
    );

     */
  }

  getElasticSearchNestedPath(): string | undefined {
    return undefined;
  }


  isEmpty(): boolean {
    return false;
  }

  toElasticSearchQuery(): Observable<Object | undefined> {
    return of(undefined);
  }


}
