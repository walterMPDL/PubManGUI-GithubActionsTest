import { AsyncPipe, CommonModule, Location } from '@angular/common';
import { AfterViewInit, Component, ContentChild, ContentChildren, Input, QueryList, ViewChildren } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ItemListElementComponent } from './item-list-element/item-list-element.component';
import {ActivatedRoute, NavigationEnd, NavigationSkipped, NavigationStart, Router} from '@angular/router';
import { TopnavComponent } from 'src/app/components/shared/topnav/topnav.component';
import { BehaviorSubject, catchError, map, Observable, of, Subscription, tap } from 'rxjs';
import { ItemVersionVO } from 'src/app/model/inge';
import { AaService } from 'src/app/services/aa.service';
import { ItemsService } from "../../services/pubman-rest-client/items.service";
import { PaginatorComponent } from "../shared/paginator/paginator.component";
import { TopnavCartComponent } from "../shared/topnav/topnav-cart/topnav-cart.component";
import { TopnavBatchComponent } from "../shared/topnav/topnav-batch/topnav-batch.component";
import { ItemListStateService } from "./item-list-state.service";
import { LoadingComponent } from "../shared/loading/loading.component";
import { NgbModal, NgbTooltip } from "@ng-bootstrap/ng-bootstrap";
import { ExportItemsComponent } from "../shared/export-items/export-items.component";
import { ItemSelectionService } from "../../services/item-selection.service";

import { TranslatePipe } from "@ngx-translate/core";
import { itemToVersionId } from "../../utils/utils";
import { FeedModalComponent } from "../shared/feed-modal/feed-modal.component";
import { ItemFilterComponent } from "./filters/item-filter/item-filter.component";
import { ItemAggregationFilterComponent } from "./aggregations/aggregation-filter/item-aggregation-filter.component";
import { SortSelectorComponent } from "./filters/sort-selector/sort-selector.component";
import {filter} from "rxjs/operators";



@Component({
  selector: 'pure-item-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ItemListElementComponent,
    AsyncPipe,
    TopnavComponent,
    PaginatorComponent,
    TopnavCartComponent,
    TopnavBatchComponent,
    LoadingComponent,
    NgbTooltip,
    TranslatePipe
  ],
  templateUrl: './item-list.component.html'
})
export class ItemListComponent implements AfterViewInit{

  @Input() searchQuery: Observable<any> = of({});
  @Input() searchResultType = false;
  //@Input() filterSectionTemplate?: TemplateRef<any> | undefined;
  @ViewChildren(ItemListElementComponent) list_items!: QueryList<ItemListElementComponent>;
  @ContentChildren(ItemFilterComponent) private filterComponents!: QueryList<ItemFilterComponent>;
  @ContentChildren(ItemAggregationFilterComponent) private aggregationComponents!: QueryList<ItemAggregationFilterComponent>;
  @ContentChild(SortSelectorComponent) private sortSelectorComponent!: SortSelectorComponent
  //@ViewChild(PaginatorComponent) paginator!: PaginatorComponent


  searchQuerySubscription!: Subscription;
  result_list: Observable<ItemVersionVO[]> | undefined;
  highlight_list: any[] = [];
  number_of_results: number = 0;

  //filterEvents: Map<string, FilterEvent> = new Map();
  //aggregationEvents: Map<string, AggregationEvent> = new Map();

  protected currentPage:number = 1;
  protected size:number = 25;
  //currentPaginatorEvent!: PaginatorChangeEvent;
  select_all = new FormControl(false);

  currentSortQuery: any;
  currentQuery: any;
  currentCompleteQuery: any;

  selectionServiceSubscription!: Subscription;
  routerEventsSubscription!: Subscription;

  /** URl of the current list. */
  listUrl:string;

  /** Set to true if the refresh via the router event subscription should be skipped.
   * Always skip first refresh, as it is handled by searchQuerySubscription */

  skipNextRefreshViaRouting= true;

  constructor(
    private service: ItemsService,
    public aa: AaService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private location:Location,
    private listStateService: ItemListStateService,
    private modalService: NgbModal,
    protected selectionService: ItemSelectionService
  )
  {

    this.listUrl = this.router.url.split('?')[0];
    this.selectionServiceSubscription = this.selectionService.selectedIds$.subscribe(ids => {
      if(ids.length > 0) {
        this.select_all.setValue(true);
      }
      else {
        this.select_all.setValue(false);
      }
    })

    //Updates this list when clicking the list link in the menu or breadcrumb, although the component is stored via PureRrs and it is a same URL navigation
    //skips the update if it was already initialized by the searchQuery subscription to prevent double updates
    this.routerEventsSubscription = this.router.events.pipe(
      //tap(ev => console.log(ev)),
      filter(event => event instanceof NavigationSkipped || event instanceof NavigationEnd),
      filter(event => event.url.split('?')[0] === this.listUrl)
    ).subscribe((event: any) => {
      //console.log(this.skipNextRefreshViaRouting)
      if(!this.skipNextRefreshViaRouting) {
        //console.log("REFRESH LIST!!!", this.listUrl);
        this.updateList();
      }
      this.skipNextRefreshViaRouting = false;

    });

  }


  ngOnDestroy() {
    this.searchQuerySubscription.unsubscribe();
    this.selectionServiceSubscription.unsubscribe();
    this.routerEventsSubscription.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.searchQuerySubscription = this.searchQuery.subscribe(q => {
      if (q) {
        //subsequent call with a new search query. If query is already set, reset values
        if(this.currentQuery) {
          this.reset();
          this.skipNextRefreshViaRouting=true;
        }
        this.currentQuery = q;
        //console.log("New Query - REFRESH");
        this.updateList();

      }
    })

  }



  public reset()
  {
    this.currentPage = 1;
    this.filterComponents.forEach(filterComp => {
      filterComp.reset();
    })
    //this.filterEvents = new Map<string, FilterEvent>();
    //Clear all aggregation results
    this.aggregationComponents.forEach(aggComp => {
      aggComp.reset();

    })

  }



  updateList() {
    this.selectionService.resetList();
    let query = this.currentQuery;

    const filterQueries = this.filterComponents
      .map(filter =>
      filter.selectedFilterEvent.query)
      .filter(filterQuery => filterQuery);
    const aggFilterQueries = this.aggregationComponents
      .map(aggComp => aggComp.selectedFilterEvent?.query)
      .filter(aggQuery => aggQuery);

    const allFilterQueries = filterQueries.concat(aggFilterQueries);

    if(allFilterQueries.length > 0) {

      if (allFilterQueries.length) {
        query = {
          bool: {
            must: [
              this.currentQuery,
              ...allFilterQueries
            ]
          }
        }
      }
    }

    let aggQueries = undefined;
    let runtimeMappings = undefined;

    const aggEvents = this.aggregationComponents
      .map(aggComponent => aggComponent.aggEvent);

    if(aggEvents.length > 0) {
      aggQueries = Object.assign({}, ...aggEvents.filter(fe => fe.query).map(fe => fe.query))
      runtimeMappings = Object.assign({}, ...aggEvents.filter(fe => fe.runtimeMapping).map(fe => fe.runtimeMapping))
    }

    this.currentSortQuery = this.sortSelectorComponent?.currentSortQuery;

    const completeQuery = {
      query: query,
      size: this.size,
      from: (this.currentPage-1)*this.size,
      ...this.currentSortQuery && {sort: this.currentSortQuery
      },
      ...runtimeMappings && {runtime_mappings: runtimeMappings},
      ...aggQueries && {aggs: aggQueries}
    }
    console.log("List query", JSON.stringify(completeQuery))

    this.currentCompleteQuery = completeQuery;
    this.search(completeQuery);
  }

  private search(body: any) {
    this.result_list = this.service.elasticSearch(body).pipe(
      tap(result => {
        //console.log(JSON.stringify(result))
        this.number_of_results = result.hits.total.value as number;
        //this.number_of_pages = Math.ceil(this.number_of_results / this.page_size)
        //this.jump_to.addValidators(Validators.max(this.number_of_pages));

        if(result.aggregations) {
          this.applyAggregationResults(result.aggregations);
        }

        this.highlight_list = result.hits.hits.map((record:any) => record.inner_hits?.file?.hits);

      }),
      map(result => result.hits.hits.map((record:any) => record._source as ItemVersionVO)),
      tap(result => {
        this.listStateService.currentFullQuery = body;
        this.listStateService.currentNumberOfRecords = this.number_of_results;
        this.listStateService.currentResultList = result;
        this.listStateService.currentPageOfList = this.currentPage;
        this.listStateService.currentSizeOfList = this.size;


      }),
      catchError(err => {
        return of([]);
      })
    );
  }

  applyAggregationResults(aggResult: object) {
    this.aggregationComponents.forEach((aggComp) => {
      // Use ends with, because PuRe currently returns aggregation names with typed_keys parameter enabled, see https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html#return-agg-type
      const aggKey = Object.keys(aggResult).find(k => k.endsWith(aggComp.aggEvent.name)) as keyof typeof aggResult;
      if(aggResult[aggKey]){
        aggComp.result.next(aggResult[aggKey]);
      }
    })
  }


  selectAllItems(event: any) {
    if (event.target.checked) {
      this.list_items.map(li => li.check_box.setValue(true));
    } else {
      this.list_items.map(li => li.check_box.setValue(false));
    }
  }

/*
  registerAggregation(ae: AggregationEvent) {
    this.aggregationEvents.set(ae.name,ae);
  }

 */
/*
  registerSort(sortQuery: any) {
    this.currentSortQuery = sortQuery;

  }

  updateSort(sortQuery: any) {
    this.currentSortQuery = sortQuery
    this.currentPage=1
    this.updateList();
    //this.onPageChange(1)

  }

 */

  updateFilterOrSort() {
    this.currentPage=1
    this.updateList();
  }



  paginatorChanged() {
    //this.currentPaginatorEvent = $event;
    this.updateList();

  }

  openExportModal() {
    const comp: ExportItemsComponent = this.modalService.open(ExportItemsComponent, {size: "lg"}).componentInstance;
    comp.type = 'exportSelected';
    comp.sortQuery = this.currentSortQuery;
    const queryWithoutAggs = this.currentCompleteQuery;
    delete queryWithoutAggs.aggs;
    comp.completeQuery = queryWithoutAggs;
  }

  openExportAllModal() {
    const comp: ExportItemsComponent = this.modalService.open(ExportItemsComponent, {size: "lg"}).componentInstance;
    comp.type = 'exportAll';
    comp.sortQuery = this.currentSortQuery;
    const queryWithoutAggs = this.currentCompleteQuery;
    delete queryWithoutAggs.aggs;
    comp.completeQuery = queryWithoutAggs;
    if(this.listStateService.currentResultList.at(0)) {
      const item = this.listStateService.currentResultList.at(0)!;
      comp.itemIds = [itemToVersionId(item)];
    }


  }

  openFeedModal() {
    const comp: FeedModalComponent = this.modalService.open(FeedModalComponent).componentInstance;
    comp.searchQuery = this.currentCompleteQuery.query;

  }

}

export interface FilterEvent {
  name: string,
  query: object | undefined;
}

export interface AggregationEvent {
  name: string,
  query: any | undefined;
  runtimeMapping: any | undefined;
  result: BehaviorSubject<any | undefined>;
}
