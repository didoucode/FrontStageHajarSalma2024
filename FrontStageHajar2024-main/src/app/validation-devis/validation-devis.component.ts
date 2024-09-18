import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConfirmationModalDevisComponent } from '../confirmation-modal-devis/confirmation-modal-devis.component';
import { MatDialog } from '@angular/material/dialog';
import { EditModalDevisComponent } from '../edit-modal-devis/edit-modal-devis.component';
import { EditModalDevisAssiComponent } from '../edit-modal-devis-assi/edit-modal-devis-assi.component';

@Component({
  selector: 'app-validation-devis',
  templateUrl: './validation-devis.component.html',
  styleUrls: ['./validation-devis.component.css']
})
export class ValidationDevisComponent implements OnInit {

  devisList: any[] = [];
  searchText: string = '';

  constructor(private adminService: AdminService, private router: Router,private dialog: MatDialog) { }

  ngOnInit(): void {
    this.loadDevis();
  }

  loadDevis(): void {
    this.adminService.getAllDevis().subscribe(
      (data: any[]) => {
        this.devisList = data;
      },
      (error: any) => {
        console.error('Erreur lors de la récupération des devis', error);
      }
    );
  }

  logout(): void {
    sessionStorage.removeItem('ASSISTANT');
    this.router.navigate(['/']);
  }

  get filteredDevis(): any[] {
    return this.devisList.filter(devis => 
      devis.etat.toLowerCase().includes(this.searchText.toLowerCase()) ||
      devis.dateDevis.toLowerCase().includes(this.searchText.toLowerCase()) ||
      devis.prospect.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
      devis.reference.toLowerCase().includes(this.searchText.toLowerCase()) ||
      devis.commercial.username.toLowerCase().includes(this.searchText.toLowerCase()) 
    );
  }

  toggleDevisState(devis: any, newState: string) {
    console.log("Objet devis :", devis);
    console.log("Nouvel état :", newState);

    devis.etat = newState;
    this.adminService.updateDevis(devis.reference, devis).subscribe(
      (updatedDevis: any) => {
        console.log('Devis mis à jour avec succès :', updatedDevis);
        if (newState === 'Validé') {
          this.getArticlesDetails(devis); 
        } else if (newState === 'Annulé') {
        }
      },
      (error: any) => {
        console.error('Erreur lors de la mise à jour du devis :', error);
      }
    );
  }

  getArticlesDetails(devis: any): void {
    this.adminService.getArticlesByDevisReference(devis.reference).subscribe(
      (devisarticles: any[]) => {
        console.log('Articles associés au devis', devisarticles);
        for (let devisArticle of devisarticles) {
          console.log("-----------");
          console.log("L'article concerné est :", devisArticle.article.designation);
          console.log("Quantité à soustraire est :", devisArticle.quantite);
          console.log("Référence envoyée :", devisArticle.article.reference);
          console.log("Quantité envoyée :", devisArticle.quantite);

          this.adminService.updateQtesArticle(devisArticle.article.reference, devisArticle.quantite).subscribe(
            (updatedArticle: any) => {
              console.log('Article mis à jour avec succès :', updatedArticle);
            },
            (error: any) => {
              console.error('Erreur lors de la mise à jour de l\'article :', error);
            }
          );
        }
      },
      (error: any) => {
        console.error('Erreur lors de la récupération des articles du devis', error);
      }
    );
  }

  annulerdevis(devis: any): void {
    console.log("Annulation du devis pour le client:", devis.prospect.name);
  }
  
  
  
 

generatePDF(devis: any): void {
  const doc = new jsPDF();
  
  const logoUrl = 'assets/logogocom-removebg-preview (1).png';
  const logoWidth = 50; // Largeur du logo en millimètres
  const logoHeight = 80; // Hauteur du logo en millimètres
  const startXLogo = 10; // Placer le logo à 10 mm du bord gauche
  const startYLogo = 2; // Placer le logo à 2 mm du bord supérieur
  
  const img = new Image();
  img.src = logoUrl;
  img.crossOrigin = 'anonymous';
  
  img.onload = () => {
    doc.addImage(img, 'PNG', startXLogo, startYLogo, logoWidth, logoHeight);
    
    const title = 'Devis';
    doc.setFontSize(18);
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(title);
    const xPosition = (pageWidth - textWidth) / 2;
    doc.text(title, xPosition, 70); // Déplace le titre plus bas

    doc.setFontSize(12);
    const startXLeft = 20; // Coordonnée X pour la partie gauche
    const startXRight = pageWidth / 2 + 30; // Augmente la coordonnée X pour la partie droite
    const startY = 90; // Coordonnée Y pour le début des informations
    const lineSpacing = 10;

    this.adminService.getArticlesByDevisReference(devis.reference).subscribe(
      (devisarticles: any[]) => {
        const articles = devisarticles.map((item: any) => {
          const prixUnitaire = item.article.prixUnitaire;
          const quantite = item.quantite;
          const remise = item.remise ?? 0;
          const prixUnitaireNet = prixUnitaire * (1 - remise / 100); // Calcul du prix unitaire net
          const totalSansRemise = prixUnitaire * quantite;
          const totalAvecRemise = totalSansRemise * (1 - remise / 100);

          return [
            item.article.reference, // Ajouter la colonne de référence d'article
            item.article.designation,
            quantite,
            `${prixUnitaire.toFixed(2)} DH`,
            `${remise}%`,
            `${prixUnitaireNet.toFixed(2)} DH`, // Ajouter prix unitaire net
            `${totalAvecRemise.toFixed(2)} DH`
          ];
        });

        const montantTTC = devis.montantTotal;
        const montantHT = articles.reduce((sum, row) => {
          return sum + parseFloat(row[6].replace(' DH', ''));
        }, 0);

        // Afficher les informations à gauche en gras et en noir
        doc.setFont('helvetica', 'bold'); // Définir la police en gras
        doc.setTextColor(0, 0, 0); // Définir la couleur du texte en noir
        doc.text(`Numéro du Devis: ${devis.reference}`, startXLeft, startY);
        doc.text(`Etat: ${devis.etat}`, startXLeft, startY + lineSpacing);
        doc.text(`Date: ${devis.dateDevis}`, startXLeft, startY + 2 * lineSpacing);
    
        // Afficher le tableau
        autoTable(doc, {
          head: [['Référence', 'Désignation', 'Quantité', 'Prix Unitaire', 'Remise', 'Prix Unitaire Net', 'Total']],
          body: articles,
          startY: startY + 4 * lineSpacing,
          theme: 'grid',
          headStyles: { 
            fillColor: [186, 133, 194]
          },
          styles: { fontSize: 10 },
          didDrawCell: (data) => {
            if (data.column.index === 0 && data.row.index === articles.length - 1) {
              // Si nous sommes à la dernière ligne du tableau
              const tableBottom = data.cell.y + data.cell.height; // Hauteur de la dernière cellule du tableau
              const marginAfterTable = 10; // Marge après le tableau
              const footerStartY = tableBottom + marginAfterTable;
  
              // Afficher les montants sous le tableau
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(12); // Augmenter la taille de la police pour les montants
              doc.setTextColor(0, 0, 0); // Définir la couleur du texte en noir
              doc.text(`Montant HT: ${montantHT.toFixed(2)} DH`, startXRight, footerStartY);
              doc.text(`Montant TTC: ${montantTTC} DH`, startXRight, footerStartY + lineSpacing);
  
              // Afficher l'état du devis plus haut
              doc.setFontSize(12);
              doc.setFont('helvetica', 'bold');
              const etatY = startY + 2 * lineSpacing - 20; // Ajuster la position de l'état du devis plus haut
              doc.text(`Client : ${devis.prospect.name}`, startXRight, etatY);
            }
          }
        });

        // Ajouter un footer centré en bas de la page
        const footerText = [
          'Adresse : 331, Lotisement LINA (SIDI MAAROUF), Casablanca 20520',
          'Téléphone : 0529002367',
          'Fax : 0522583199'
        ];
        const footerY = doc.internal.pageSize.height - 26; // Position verticale du footer

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        footerText.forEach((line, index) => {
          const lineWidth = doc.getTextWidth(line);
          const footerX = (pageWidth - lineWidth) / 2; // Centrer horizontalement
          doc.text(line, footerX, footerY + (index * 10)); // Ajouter du texte avec un espacement vertical
        });

        doc.save(`Devis_${devis.reference}.pdf`);
      },
      (error: any) => {
        console.error('Erreur lors de la récupération des articles du devis', error);
      }
    );
  };

  img.onerror = (error) => {
    console.error('Erreur lors du chargement de l\'image', error);
  };
}

  
  
  

  
  
  deleteDevis(devis: any): void {
    const dialogRef = this.dialog.open(ConfirmationModalDevisComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.adminService.deleteDevis(devis.reference).subscribe(
          () => {
            this.loadDevis();
          },
          (error: any) => {
            console.error('Erreur lors de la suppression du devis', error);
          }
        );
      }
    });
  }

  editDevis(devis: any): void {
    // Ouvrir le modal d'édition avec les détails du devis sélectionné
    const dialogRef = this.dialog.open(EditModalDevisAssiComponent, {
      width: '1100px', // Ajustez la largeur du modal si nécessaire
      height: 'auto',
      maxHeight: '100vh',
      panelClass: 'custom-dialog-container',
      data: devis,
    });

    dialogRef.afterClosed().subscribe(result => {
      // Ici, vous pouvez traiter la logique après la fermeture du modal d'édition
      if (result) {
        console.log('Les détails du devis ont été mis à jour :', result);
        // Rechargez la liste des devis ou faites d'autres actions nécessaires
        this.loadDevis();
      }
    });
  }
  
}
