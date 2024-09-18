import { Component, OnInit } from '@angular/core';
import { AdminService } from '../services/admin.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SuccessAddArticleComponent } from '../success-add-article/success-add-article.component';

@Component({
  selector: 'app-add-article',
  templateUrl: './add-article.component.html',
  styleUrls: ['./add-article.component.css'],
    //selector: 'app-article-import',
  //templateUrl: './article-import.component.html'
})
export class AddArticleComponent implements OnInit {

  article: any = {
    reference: null,
    designation: '',
    prixUnitaire: 0,
    prixAchat: 0,
    image: null,
    pvp: 0,
    qteEnStock: 0,
    qteCommandee: 0,
    qteReservee: 0,
    categorie: {
      id: null,
      name: '',
      //selectedFile: File = null;
    }
  };
  categorieId: any = '';  // Initialize to empty string to select the default option
  selectedFile: File | null = null;
  showModal: boolean = false;
  categories: any[] = [];

  constructor(private adminService: AdminService, public dialogRef: MatDialogRef<AddArticleComponent>,private dialog: MatDialog) { }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.adminService.getCategories().subscribe(
      (response: any) => {
        this.categories = response;
      },
      (error: any) => {
        console.error('Error loading categories', error);
      }
    );
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile) {
      this.convertToBase64(this.selectedFile);
    }
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  convertToBase64(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result?.toString().split(',')[1]; // Exclure les métadonnées
      if (base64String) {
        this.article.image = base64String;
      }
    };
    reader.readAsDataURL(file);
  }

//plusieurs articles

onFileSelected1(event: any) {
  this.selectedFile = event.target.files[0];
}

  readFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      this.parseCSV(content);  // Assumons que le fichier est CSV pour cet exemple
    };
    reader.readAsText(file);
  }

  parseCSV(content: string): void {
    const lines = content.split('\n');
    const articles = lines.map(line => {
      const [reference, designation, prixUnitaire, prixAchat, qteEnStock, category] = line.split(',');
      return {
        reference,
        designation,
        prixUnitaire: +prixUnitaire,
        prixAchat: +prixAchat,
        qteEnStock: +qteEnStock,
        categorie: { id: category, name: '' }
      };
    });
    this.addArticles(articles);
  }

  addArticles(articles: any[]): void {
    const requests = articles.map(article => {
      return this.adminService.getCategorieById(article.categorie.id).pipe(
        switchMap((category: any) => {
          article.categorie = category;
          return this.adminService.addArticle(article);
        })
      );
    });

    forkJoin(requests).subscribe(
      responses => {
        console.log('Articles ajoutés avec succès', responses);
        this.showModal = true;
        const dialogRef = this.dialog.open(SuccessAddArticleComponent, {
          width: '400px',
          height: 'auto',
          maxHeight: '80vh'
        });
        this.resetForm();
      },
      error => {
        console.error('Error adding articles', error);
      }
    );
  }









  onSubmit(): void {

    if (this.selectedFile) {
      const formData = new FormData();
      formData.append('file', this.selectedFile, this.selectedFile.name);

      /*this.http.post('/api/articles/import-csv', formData).subscribe(
       response => {
          console.log('Importation réussie', response);
        },
        error => {
          console.error('Erreur lors de l\'importation', error);
        }
      );*/
    } else {
      console.error('Aucun fichier sélectionné');
    }


    if (this.categorieId) {
      this.adminService.getCategorieById(this.categorieId).subscribe(
        (response: any) => {
          this.article.categorie = response;
          this.article.pvp=this.article.prixUnitaire;

          this.adminService.addArticle(this.article).subscribe(
            (response: any) => {
              console.log('Article ajouté avec succès', response);
              this.onConfirm();
              this.showModal = true;
              const dialogRef = this.dialog.open(SuccessAddArticleComponent, {
                width: '400px',
                height: 'auto',
                maxHeight: '80vh'
              });


              // Réinitialiser le formulaire après l'ajout
              this.resetForm();
            },
            (error: any) => {
              console.error('Error adding article', error);
            }
          );
        },
        (error: any) => {
          console.error('Error loading category', error);
        }
      );
    } else {
      console.error('Aucune catégorie sélectionnée');
    }

  }
  onCancel(): void {
    this.dialogRef.close();
  }
  resetForm(): void {
    this.article = {
      reference: null,
      designation: '',
      prixUnitaire: 0,
      prixAchat: 0,
      image: null,
      pvp: 0,
      qteEnStock: 0,
      qteCommandee: 0,
      qteReservee: 0,
      categorie: {
        id: null,
        name: ''
      }
    };
    this.selectedFile = null;
  }

  hideModal(): void {
    this.showModal = false;
  }
}
