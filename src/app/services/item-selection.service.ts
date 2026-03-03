import { Injectable } from '@angular/core';
import { BehaviorSubject } from "rxjs";
import { NavigationEnd, Router } from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class ItemSelectionService {

  selectedIds$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([])

  constructor(private router: Router) {
    //Empty list when navigating to other page
    router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd) {
        //console.log("Reset Selection List");
        this.resetList();
      }
    })
  }

  addToSelection(...ids:string[]) {

    let count = 0;
    const currentIds = this.selectedIds$.value;
    ids.forEach(id => {
        if(!currentIds.includes(id)) {
          currentIds.push(id)
          count++
        }
      }
    )
    if (count>0) {
      this.selectedIds$.next(currentIds);
    }

    //console.log("Add" + currentIds)
    return count;
  }

  removeFromSelection(...ids:string[]): number {
    let count = 0;
    const currentIds = this.selectedIds$.value;
    ids.forEach(id => {
        if(currentIds.includes(id)) {
          const pos = currentIds.indexOf(id)
          if(pos > -1) {
            currentIds.splice(pos, 1);
            count++;
          }
        }
      }
    )
    if (count>0) {
      this.selectedIds$.next(currentIds);
    }
    //console.log("Remove " + currentIds)
    return count;
  }

  resetList() {
    this.selectedIds$.next([])
  }
}
