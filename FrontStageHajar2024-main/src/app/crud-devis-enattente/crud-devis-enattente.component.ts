import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AdminService } from '../services/admin.service';
import { ModalDevisDetailsComponent } from '../modal-devis-details/modal-devis-details.component';
import { ConfirmationModalDevisComponent } from '../confirmation-modal-devis/confirmation-modal-devis.component';
import { EditModalDevisComponent } from '../edit-modal-devis/edit-modal-devis.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AddDevisModalComponent } from '../add-devis-modal/add-devis-modal.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
@Component({
  selector: 'app-crud-devis-enattente',
  templateUrl: './crud-devis-enattente.component.html',
  styleUrls: ['./crud-devis-enattente.component.css']
})
export class CrudDevisEnattenteComponent implements OnInit {

  devisList: any[] = [];
  commercialId: any;
  showMessageOnClick = false; // Flag to show message on click
  selectedDevis: any; // Store the selected devis for message display
  filteredDevis: any[] = [];
  selectedEtat: string = '';
  constructor(private adminService: AdminService, private dialog: MatDialog, private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.loadDevis();
  }

  filterDevis(): void {
    if (this.selectedEtat === '') {
      this.filteredDevis = this.devisList; // Afficher tous les prospects si aucun filtre n'est sélectionné
    } else {
      this.filteredDevis = this.devisList.filter(devis => devis.etat === this.selectedEtat);
    }
  }
  loadDevis(): void {
    const commercialDataString = sessionStorage.getItem('COMMERCIAL');
    if (commercialDataString) {
      const commercial = JSON.parse(commercialDataString);
      this.commercialId = commercial.id;
    }
    this.adminService.getDevisEnAttenteByCommercial(this.commercialId).subscribe(
      (data: any[]) => {
        this.devisList = data;
        this.filteredDevis = data;

        console.log("devislist :", this.devisList);
      },
      (error: any) => {
        console.error('Erreur lors de la récupération des devis', error);
      }
    );
  }

  openDetailsModal(devis: any): void {
    this.adminService.getArticlesByDevisReference(devis.reference).subscribe(
      (devisarticles: any[]) => {
        // Ouvrir le modal avec les détails des articles du devis
        const dialogRef = this.dialog.open(ModalDevisDetailsComponent, {
          width: '600px',

          data: {
            devis: devis,
            devisarticles: devisarticles
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          console.log('Le modal des détails du devis a été fermé');
        });
      },
      (error: any) => {
        console.error('Erreur lors de la récupération des articles du devis', error);
      }
    );
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

  editDevis(devis: any): void {
    // Ouvrir le modal d'édition avec les détails du devis sélectionné
    const dialogRef = this.dialog.open(EditModalDevisComponent, {
      width: '1100px', // Ajustez la largeur du modal si nécessaire
      height: 'auto',
      maxHeight: '100vh',
      panelClass: 'custom-dialog-container',

      data: devis // Passez les détails du devis à votre modal d'édition
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

  // Méthode pour afficher la notification lors du survol ou du clic sur un devis désactivé
  showNotification(devis: any): void {
    if (devis.etat === 'Validé') {
      this.snackBar.open('Ce devis a été validé par l\'Assistant ADV. Donc, vous n\'avez pas le droit de le modifier', 'Fermer', {
        duration: 5000, // Durée en millisecondes (5 secondes ici)
        horizontalPosition: 'center', // Position horizontale de la notification
        verticalPosition: 'top' // Position verticale de la notification
      });
      
    } else if (devis.etat === 'Annulé') {
      this.snackBar.open('Ce devis a été annulé par l\'Assistant ADV.', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'center', // Position horizontale de la notification

        verticalPosition: 'top' // Position verticale de la notification

      });
    }
  }
  isDevisInactive(devis: any): boolean {
    return devis.etat === 'Validé' || devis.etat === 'Annulé';
  }
  openAddDevisModal(): void {
    const dialogRef = this.dialog.open(AddDevisModalComponent, {
      width: '600px', // Ajustez la largeur du modal si nécessaire
      height: 'auto',
      maxHeight: '80vh',
      panelClass: 'custom-dialog-container',
      data: { commercialId: this.commercialId } // Passer les données du commercial au modal
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
     this.loadDevis();
      }
    });
  }
  
}
