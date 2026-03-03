import { Routes } from '@angular/router';
import { itemResolver } from "./services/pubman-rest-client/item-resolver";
import { ItemFormComponent } from "./components/item-edit/item-form/item-form.component";
import { ItemSearchAdvancedComponent } from "./components/item-search-advanced/item-search-advanced.component";
import { fetchItemResolver } from './components/imports/services/fetch-item-resolver';





export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    //component: HomeComponent,
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
    data: {
      breadcrumb: {
        labelKey: 'common.home',
      }
    },
  },
  {
    path: 'my',
    loadComponent: () => import('./components/my-items/my-items.component').then(m => m.MyItemsComponent),
    data: {
      saveComponent: true,
      breadcrumb: {
        labelKey: 'common.my',
      }
    },
  },
  {
    path: 'qa',
    loadComponent: () => import('./components/qa-workspace/qa-workspace.component').then(m => m.QaWorkspaceComponent),
    data: {
      saveComponent: true,
      breadcrumb: {
        labelKey: 'common.qa',
      }
    },
  },
  {
    path: 'search',
    //component: SearchResultListComponent,
    loadComponent: () => import('./components/search-result-list/search-result-list.component').then(m => m.SearchResultListComponent),
    data: {
      saveComponent: true,
      breadcrumb: {
        labelKey: 'common.searchResult',
        keepIfLast: ['header.advancedSearch'],
      }
    },
  },
  {
    path: 'cart',
    loadComponent: () => import('./components/cart-list/cart-list.component').then(m => m.CartListComponent),
    data: {
      saveComponent: true,
      breadcrumb: {
        labelKey: 'common.basket',
      }
    },
  },
  {
    path: 'ou-tree',
    //component: OuTreeComponent,
    loadComponent: () => import('./components/ou-tree/ou-tree.component').then(m => m.OuTreeComponent),
    data: {
      breadcrumb: {
        labelKey: 'common.ouTree',
      }
    },
  },

  {
    path: 'advanced-search',
    component: ItemSearchAdvancedComponent,
    //loadComponent: () => import('./components/item-search-advanced/item-search-advanced.component').then(m => m.ItemSearchAdvancedComponent),
    //loadComponent: () => import('./components/test/test.component').then(m => m.TestComponent),
    data: {
      saveComponent: true,
      breadcrumb: {
        labelKey: 'header.advancedSearch',
      }
    }
  },
  {
    path: 'edit/:id',
    component: ItemFormComponent,
    //loadComponent: () => import('./components/item-edit/item-form/item-form.component').then(m => m.ItemFormComponent),
    resolve: { item: itemResolver },
    data: {
      breadcrumb: {
        labelKey: 'common.edit',
        keepIfLast: [],
      }
    },
  },
  {
    path: 'view/:id',

    loadComponent: () => import('./components/item-view/item-view.component').then(m => m.ItemViewComponent),
    //loadComponent: () => import('./components/item-view/item-view.component').then(m => m.ItemViewComponent),

    data: {
      breadcrumb: {
        labelKey: 'common.view',
        keepIfLast: [],
      }
    },
  },
  {
    path: 'edit',
    component: ItemFormComponent,
    //loadComponent: () => import('./components/item-edit/item-form/item-form.component').then(m => m.ItemFormComponent),

    resolve: { templateItem: itemResolver },
    data: {
      breadcrumb: {
        labelKey: 'common.edit'
      }
    },
  },
  {
    path: 'edit_import',
    component: ItemFormComponent,
    //loadComponent: () => import('./components/item-edit/item-form/item-form.component').then(m => m.ItemFormComponent), resolve: { item: fetchItemResolver },
    resolve: { item: fetchItemResolver },
    data: {
      breadcrumb: {
        labelKey: 'imports.edit',
      }
    },
  },
  {
    path: 'batch',
    loadChildren: () => import('./components/batch/batch-routing.module').then(m => m.BatchRoutingModule),
    data: {
      breadcrumb: {
        labelKey: 'batch.name',
        //active: false
      }
    }
  },
  {
    path: 'imports',
    loadChildren: () => import('./components/imports/imports-routing.module').then(m => m.ImportsRoutingModule),
    data: {
      breadcrumb: {
        labelKey: 'imports.name',
        //active: false
      }
    }
  },
  {
    path: 'help', loadComponent: () => import('./pages/help/help.component').then(m => m.HelpComponent),
    data: {
      breadcrumb: {
        labelKey: 'common.help',
      }
    }
  },
  {
    path: 'disclaimer', loadComponent: () => import('./pages/disclaimer/disclaimer.component').then(m => m.DisclaimerComponent),
    data: {
      breadcrumb: {
        labelKey: 'footer.disclaimer',
      }
    }
  },
    {
    path: 'privacy-policy', loadComponent: () => import('./pages/privacy-policy/privacy.component').then(m => m.PrivacyComponent),
    data: {
      breadcrumb: {
        labelKey: 'footer.privacy',
      }
    }
  },
  {
    path: '**',
    loadComponent: () => import('./components/shared/page-not-found/page-not-found.component').then(m => m.PageNotFoundComponent)
  }
];
