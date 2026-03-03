import { Injectable } from '@angular/core';
import { ItemVersionVO } from "../../model/inge";
import { Router } from "@angular/router";
import { BehaviorSubject, map, Observable, of, tap } from "rxjs";
import { AaService } from "../../services/aa.service";
import { ItemsService } from "../../services/pubman-rest-client/items.service";

@Injectable({
  providedIn: 'root'
})
export class ItemListStateService {

  /*
  This behaviour subject should be called whenever changes to an item were made.
  The list will subscribe to this and update the item in the list.
   */
  //itemUpdated: BehaviorSubject<string | undefined> = new BehaviorSubject<string | undefined>(undefined);


  currentFullQuery: any = undefined;
  currentNumberOfRecords = 0;
  currentPageOfList = 0;
  currentSizeOfList = 0;
  currentResultList: ItemVersionVO[] = [];

  page = 1;

  constructor(private router:Router, private aa:AaService, private itemService: ItemsService) { }

  initItemId(itemId: string) {
    const index = this.currentResultList.findIndex(i => i.objectId === itemId);
    if(index !== -1) {
      this.page = ((this.currentPageOfList - 1) * this.currentSizeOfList) + index + 1;
    }
    else {
      this.page = 0;
    }
  }


  paginatorChanged() {

    const currentStart = ((this.currentPageOfList -1) * this.currentSizeOfList) + 1;
    const curentEnd = (this.currentPageOfList) * this.currentSizeOfList;

    console.log(this.page, currentStart, curentEnd);

    //if selected item is not in current range, do a new search
    if(this.page > curentEnd || this.page < currentStart) {
      this.search().subscribe(list => {
        this.currentResultList = list;
        this.navigateToItemPage();
      })
    }
    else {
      this.navigateToItemPage();
    }

  }

  private navigateToItemPage() {
    const index:number = this.page - ((this.currentPageOfList -1) * this.currentSizeOfList)
    console.log("Navigate to item number " + index + " in current list")
    const objectId = this.currentResultList[index-1].objectId;
    this.router.navigate([`/view/${objectId}`]);
  }

  private search(): Observable<ItemVersionVO[]> {

    if (this.currentFullQuery) {

      const from = (Math.floor((this.page-1) / this.currentSizeOfList)) * this.currentSizeOfList;
      console.log("Set from to " + from);
      this.currentPageOfList = (from / this.currentSizeOfList) + 1;
      console.log("Set currentPageOfList to " + this.currentPageOfList);
      this.currentFullQuery.size = this.currentSizeOfList;
      this.currentFullQuery.from = from;

      console.log("Searching from " + this.currentFullQuery.from + " size " + this.currentFullQuery.size);

      return this.itemService.elasticSearch(this.currentFullQuery).pipe(
        tap(result => {
          //console.log(JSON.stringify(result))
          this.currentNumberOfRecords = result.hits.total.value as number;
        }),
        map(result => result.hits.hits.map((record: any) => record._source as ItemVersionVO))
      );
    }
    return of([])


  }


}
