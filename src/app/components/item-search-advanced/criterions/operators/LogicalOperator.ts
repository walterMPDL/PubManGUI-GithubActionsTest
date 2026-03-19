import { SearchCriterion } from "../SearchCriterion";
import { Observable, of } from "rxjs";

export class LogicalOperator extends SearchCriterion {


  constructor(type: string, opts?:any) {
    super(type, opts);
    this.removeControl("content");
    /*
    this.content.addControl(
      "operator" , new FormControl(type)
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
